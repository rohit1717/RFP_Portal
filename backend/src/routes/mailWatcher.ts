import Imap from "imap";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { createProposalFromEmail } from "../services/proposalService.js"; // adjust path


function requiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var ${name}`);
    return v;
}

type StartOpts = {
    sendAck?: boolean;
    fromAddress?: string;
}

// Read config from env
const IMAP_USER = requiredEnv("IMAP_USER");
const IMAP_PASS = requiredEnv("IMAP_PASS");
const IMAP_HOST = requiredEnv("IMAP_HOST");
const IMAP_PORT = Number(process.env.IMAP_PORT ?? "993");
const IMAP_TLS = (process.env.IMAP_TLS ?? "true") !== "false";

const SMTP_HOST = requiredEnv("SMTP_HOST");
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_SECURE = (process.env.SMTP_SECURE ?? "false") === "true";
const SMTP_USER = requiredEnv("SMTP_USER");
const SMTP_PASS = requiredEnv("SMTP_PASS");
const DEFAULT_FROM = process.env.FROM_EMAIL ?? IMAP_USER;

// Helper: extract rfpId from addresses like rfp+<id>@domain
// utils/mail.ts
export function extractRfpIdFromAddresses(addresses: unknown = []): string | null {
    // normalize to array
    const list = Array.isArray(addresses) ? addresses : [addresses];

    for (const item of list) {
        if (!item && item !== 0) continue;

        // If it's a string, test it directly
        if (typeof item === "string") {
            const m = item.match(/rfp\+([^@]+)@/i);
            if (m) return m[1] ?? null;
            continue;
        }

        // If it's an object, attempt to read common fields used by parsers
        if (typeof item === "object") {
            // item may be like: { address: 'foo@bar', name: 'Foo' } or { value: 'foo@bar' } or nodemailer's AddressObject { name, address }
            const asAny = item as Record<string, unknown>;

            // possible fields that contain an address
            const candidates = [
                asAny.address,
                asAny.value,
                // some libs place emails in 'mailbox' + 'host' (rare), or 'text' etc. Add fallback to String(item)
            ];

            for (const cand of candidates) {
                if (!cand) continue;
                const s = typeof cand === "string" ? cand : String(cand);
                const m = s.match(/rfp\+([^@]+)@/i);
                if (m) return m[1] ?? null;
            }

            // Last resort: try stringifying the whole object (some header lines)
            try {
                const s = JSON.stringify(item);
                const m = s.match(/rfp\+([^@]+)@/i);
                if (m) return m[1] ?? null;
            } catch {
                // ignore stringify errors
            }
        } else {
            // fallback: try toString on primitives (numbers, booleans etc)
            try {
                const s = String(item);
                const m = s.match(/rfp\+([^@]+)@/i);
                if (m) return m[1] ?? null;
            } catch {
                // ignore
            }
        }
    }

    return null;
}


export function startMailWatcher(opts: StartOpts = {}) {
    // IMAP config - now guaranteed to be strings
    const IMAP_CONFIG = {
        user: IMAP_USER,
        password: IMAP_PASS,
        host: IMAP_HOST,
        port: IMAP_PORT,
        tls: IMAP_TLS,
        tlsOptions: { rejectUnauthorized: false },
        keepalive: true,
    } as const;

    const SMTP_CONFIG = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    } as const;

    // Create IMAP client
    const imap = new Imap(IMAP_CONFIG as any); // imap module has its own types; passing validated config

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    imap.once("ready", () => {
        console.log("[mailWatcher] IMAP ready — opening INBOX");
        imap.openBox("INBOX", false, (err, box) => {
            if (err) {
                console.error("[mailWatcher] openBox error", err);
                return;
            }
            console.log(`[mailWatcher] INBOX opened. ${box.messages.total} messages in box.`);

            // On new mail, fetch unseen
            imap.on("mail", () => {
                processUnseen();
            });

            // also process unseen messages on startup
            processUnseen();
        });
    });

    imap.once("error", (err: Error) => {
        console.error("[mailWatcher] IMAP error", err);
    });

    imap.once("end", () => {
        console.log("[mailWatcher] IMAP connection ended");
    });

    imap.connect();

    function extractRfpIdFromSubject(subject: string | null | undefined): string | null {
        if (!subject) return null;

        // Matches: [RFP-ID:12345]
        let m = subject.match(/\[RFP-ID:([^\]]+)\]/i);
        if (m) return m[1] ?? "";

        // Matches: (12345)
        m = subject.match(/\(#([^)]+)\)/);
        if (m) return m[1] ?? "";

        // Matches: RFP 12345
        m = subject.match(/\bRFP\s+([A-Za-z0-9_-]+)\b/i);
        if (m) return m[1] ?? "";

        return null;
    }

    // function to search for unseen messages and process them
    function processUnseen() {
        try {
            imap.search(["UNSEEN"], (err, results) => {
                if (err) {
                    console.error("[mailWatcher] search error", err);
                    return;
                }
                if (!results || !results.length) {
                    return;
                }

                const fetch = imap.fetch(results, { bodies: "", markSeen: true });

                fetch.on("message", (msg, seqno) => {
                    console.log(`[mailWatcher] New message #${seqno}`);
                    let rawBuffer = Buffer.from([]);
                    msg.on("body", (stream) => {
                        stream.on("data", (chunk: Buffer) => {
                            rawBuffer = Buffer.concat([rawBuffer, chunk]);
                        });
                    });

                    msg.once("attributes", () => {
                        // attributes could be used for flags etc.
                    });

                    msg.once("end", async () => {
                        try {
                            const parsed: any = await simpleParser(rawBuffer); // typed as 'any' to make runtime safe parsing easier

                            // parsed.to may be undefined, string, or AddressObject; same for parsed.from
                            const toAddresses = parsed?.to ?? null;
                            const fromAddresses = parsed?.from ?? null;

                            // Try to extract vendor email and rfpId safely
                            const fromValueArray = (fromAddresses && (fromAddresses as any).value) ? (fromAddresses as any).value : null;
                            const vendorEmail = Array.isArray(fromValueArray) ? (fromValueArray[0]?.address ?? null) : (typeof parsed.from === "string" ? parsed.from : (parsed.from?.text ?? null));

                            // Extract rfpId from to / headerlines (robust)
                            const rfpId =
                                extractRfpIdFromSubject(parsed.subject);
                            if (!rfpId) {
                                console.warn("[mailWatcher] No rfpId found in message; skipping:", parsed.subject || "(no subject)");
                                return;
                            }

                            const textBody = parsed.text || parsed.textAsHtml || parsed.html || "";

                            // Call your existing service to create proposal
                            try {
                                console.log(`[mailWatcher] Creating proposal for rfpId=${rfpId} from ${vendorEmail}`);
                                const proposal = await createProposalFromEmail(rfpId, vendorEmail, textBody);

                                console.log(`[mailWatcher] Created proposal id=${proposal?._id || "unknown"}`);

                                // Optionally send acknowledgement email to vendor (only if vendorEmail is a string)
                                if (opts.sendAck !== false && typeof vendorEmail === "string" && vendorEmail.length > 0) {
                                    try {
                                        const ackSubject = `Re: ${parsed.subject || "Proposal received"}`;
                                        const ackText = `Thanks — we received your proposal for RFP ${rfpId}. Proposal id: ${proposal?._id || "N/A"}. We will review and respond.\n\nIf this is incorrect, reply to this message.`;
                                        await transporter.sendMail({
                                            from: opts.fromAddress ?? DEFAULT_FROM,
                                            to: vendorEmail, // vendorEmail is guaranteed to be string here
                                            subject: ackSubject,
                                            text: ackText,
                                        });
                                        console.log(`[mailWatcher] Sent ack to ${vendorEmail}`);
                                    } catch (sendErr) {
                                        console.error("[mailWatcher] Failed to send ack email", sendErr);
                                    }
                                } else {
                                    if (opts.sendAck !== false) {
                                        console.warn("[mailWatcher] Skipping ack email because vendorEmail is missing.");
                                    }
                                }
                            } catch (svcErr) {
                                console.error("[mailWatcher] createProposalFromEmail failed", svcErr);
                                // don't re-throw — we mark seen so we don't loop endlessly
                            }
                        } catch (parseErr) {
                            console.error("[mailWatcher] parse message failed", parseErr);
                        }
                    });
                });

                fetch.once("error", (fetchErr) => {
                    console.error("[mailWatcher] fetch error", fetchErr);
                });
            });
        } catch (ex) {
            console.error("[mailWatcher] processUnseen error", ex);
        }
    }

    // return object to allow graceful shutdown
    return {
        stop: () => {
            try {
                imap.end();
            } catch (e) {
                console.warn("[mailWatcher] stop error", e);
            }
        },
    };
}