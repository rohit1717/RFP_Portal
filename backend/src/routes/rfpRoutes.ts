import { Router, type Request, type Response } from "express";
import { RfpModel } from "../models/Rfp.js";
import { VendorModel } from "../models/Vendor.js";
import { createRfpFromText, listRfps, getRfpById } from "../services/rfpService.js";
import { compareProposals } from "../services/proposalService.js";
import { sendEmail } from "../config/mailer.js";

const router = Router();

/**
 * POST /api/rfps/from-text
 * body: { description: string }
 */
router.post("/from-text", async (req: Request, res: Response) => {
    try {
        const { description } = req.body;
        if (!description || typeof description !== "string") {
            return res.status(400).json({ error: "description is required" });
        }

        const rfp = await createRfpFromText(description);
        return res.status(201).json(rfp);
    } catch (err: any) {
        console.error("POST /api/rfps/from-text error:", err);
        return res.status(500).json({ error: err.message || "Failed to create RFP" });
    }
});

/**
 * GET /api/rfps
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const rfps = await listRfps();
        return res.json(rfps);
    } catch (err: any) {
        console.error("GET /api/rfps error:", err);
        return res.status(500).json({ error: "Failed to list RFPs" });
    }
});

/**
 * GET /api/rfps/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "RFP ID is required" });
        }

        const rfp = await getRfpById(id);
        if (!rfp) return res.status(404).json({ error: "RFP not found" });
        return res.json(rfp);
    } catch (err: any) {
        console.error("GET /api/rfps/:id error:", err);
        return res.status(500).json({ error: "Failed to fetch RFP" });
    }
});

/**
 * POST /api/rfps/:id/send
 * body: { vendorIds: string[] }
 * Sends emails to selected vendors using sendEmail.
 */
router.post("/:id/send", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { vendorIds } = req.body;

        if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
            return res.status(400).json({ error: "vendorIds must be a non-empty array" });
        }
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "RFP ID is required" });
        }


        const rfp = await getRfpById(id);
        if (!rfp) return res.status(404).json({ error: "RFP not found" });

        const vendors = await VendorModel.find({ _id: { $in: vendorIds } }).lean();
        if (!vendors.length) return res.status(404).json({ error: "No vendors found for provided ids" });

        const sendPromises = vendors.map(v =>
            sendEmail({
                to: v.email ?? "",
                subject: `[RFP-ID:${rfp._id}] RFP: ${rfp.title || "New RFP"}`,
                text: [
                    `Hello ${v.name || ""},`,
                    "",
                    `Please provide a quote for the following RFP:`,
                    `${rfp.description || ""}`,
                    "",
                    `Budget: ${rfp.budget ?? "N/A"}`,
                    `Delivery (days): ${rfp.deliveryTimelineDays ?? "N/A"}`,
                    `Payment terms: ${rfp.paymentTerms ?? "N/A"}`,
                    `Warranty (months): ${rfp.warrantyMonths ?? "N/A"}`,
                    "",
                    "Items:",
                    ...(rfp.items?.map(i => `- ${i.quantity} x ${i.name} (${i.specs ?? ""})`) || []),
                    "",
                    `Reply to this email with your proposal.`
                ].join("\n"),
                html: `<p>Hello ${v.name || ""},</p>
               <p>Please provide a quote for the following RFP:</p>
               <pre>${rfp.description ?? ""}</pre>
               <p>Budget: ${rfp.budget ?? "N/A"}</p>
               <p>Delivery (days): ${rfp.deliveryTimelineDays ?? "N/A"}</p>
               <p>Payment terms: ${rfp.paymentTerms ?? "N/A"}</p>
               <p>Warranty (months): ${rfp.warrantyMonths ?? "N/A"}</p>
               <ul>${(rfp.items || []).map(i => `<li>${i.quantity} x ${i.name} (${i.specs ?? ""})</li>`).join("")}</ul>
               <p>Reply to this email with your proposal.</p>`
            })
        );

        await Promise.all(sendPromises);
        // Optionally update rfp status to 'sent'
        await RfpModel.findByIdAndUpdate(id, { status: "sent" });

        return res.json({ message: "RFP emails sent", sentTo: vendors.map(v => v.email) });
    } catch (err: any) {
        console.error("POST /api/rfps/:id/send error:", err);
        return res.status(500).json({ error: "Failed to send RFP emails" });
    }
});

/**
 * GET /api/rfps/:id/comparison
 * Runs AI comparison across proposals for the RFP and returns result
 */
router.get("/:id/comparison", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "RFP ID is required" });
        }
        const result = await compareProposals(String(id));
        return res.json(result);
    } catch (err: any) {
        console.error("GET /api/rfps/:id/comparison error:", err);
        return res.status(500).json({ error: "Failed to compare proposals" });
    }
});

export default router;
