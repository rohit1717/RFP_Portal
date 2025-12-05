import Groq from "groq-sdk";
import dotenv from "dotenv";
import { nanoid } from "nanoid/non-secure";
dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ProposalJson = {
  prices?: { itemName: string; unitPrice: number; totalPrice: number }[];
  totalPrice?: number;
  paymentTerms?: string;
  warrantyMonths?: number;
  deliveryTimelineDays?: number;
  notes?: string;
  [k: string]: any;
};

// 1) Turn NL into RFP structure
export async function parseRfpFromText(userText: string) {
  const systemPrompt = `
You are an assistant that turns procurement descriptions into structured JSON RFPs.
Return ONLY valid JSON. Schema:
{
  "title": string,
  "description": string,
  "budget": number,
  "deliveryTimelineDays": number,
  "items": [
    { "name": string, "quantity": number, "specs": string }
  ],
  "paymentTerms": string,
  "warrantyMonths": number
}
  `;
  const content = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }]
  });
  const raw = content.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

function extractFirstJsonObject(text: string): string | null {
  if (!text) return null;

  // 1) fenced ```json ... ``` (preferred)
  const fenceJson = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceJson && fenceJson[1]) return fenceJson[1].trim();

  // 2) any fenced block ``` ... ```
  const anyFence = text.match(/```([\s\S]*?)```/);
  if (anyFence && anyFence[1]) return anyFence[1].trim();

  // 3) find first balanced { ... } object by scanning braces
  const firstOpen = text.indexOf("{");
  if (firstOpen !== -1) {
    let depth = 0;
    for (let i = firstOpen; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(firstOpen, i + 1).trim();
          return candidate;
        }
      }
    }
  }

  // 4) fallback: strip backticks, try again
  const stripped = text.replace(/`/g, "").trim();
  const sOpen = stripped.indexOf("{");
  const sClose = stripped.lastIndexOf("}");
  if (sOpen !== -1 && sClose > sOpen) {
    return stripped.slice(sOpen, sClose + 1);
  }

  return null;
}

function coerceNumbers(obj: any): any {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(coerceNumbers);
  if (typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      // keys we expect to be numeric
      if (
        v !== null &&
        typeof v === "string" &&
        // basic numeric test (allow commas)
        /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(v.trim())
      ) {
        // remove commas and parse
        const cleaned = v.replace(/,/g, "");
        const n = Number(cleaned);
        out[k] = Number.isFinite(n) ? n : v;
      } else if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim())) {
        out[k] = Number(v);
      } else {
        out[k] = coerceNumbers(v);
      }
    }
    return out;
  }
  return obj;
}

/**
 * Parse raw model output and return normalized ProposalJson
 */
async function parseModelProposalOutput(raw: string): Promise<ProposalJson> {
  // Try direct parse first
  try {
    const parsed = JSON.parse(raw);
    return coerceNumbers(parsed);
  } catch {
    // continue
  }

  const candidate = extractFirstJsonObject(raw);
  if (!candidate) {
    // no candidate JSON found
    throw new Error(
      `Model did not return JSON. Raw output (first 1200 chars):\n${raw.slice(
        0,
        1200
      )}`
    );
  }

  try {
    const parsed2 = JSON.parse(candidate);
    return coerceNumbers(parsed2);
  } catch (err) {
    // final fallback: try a tolerant eval-style parse (VERY CAREFUL) — NOT recommended for untrusted inputs
    // We'll avoid eval for safety; return helpful error instead
    throw new Error(
      `Failed to parse extracted JSON candidate. Candidate:\n${candidate}\n\nRaw:\n${raw}\n\nparse error: ${err}`
    );
  }
}

/**
 * Public function: calls the model and returns parsed proposal JSON.
 */
export async function extractProposalFromEmail(
  rfp: any,
  vendor: { name?: string },
  emailText: string
): Promise<ProposalJson> {
  const systemPrompt = `You extract proposal details from vendor emails into JSON.
Return ONLY valid JSON with this schema:
{
  "prices": [
    { "itemName": string, "unitPrice": number, "totalPrice": number }
  ],
  "totalPrice": number,
  "paymentTerms": string,
  "warrantyMonths": number,
  "deliveryTimelineDays": number,
  "notes": string
}
Ensure numbers are numeric, not strings. Do not wrap output in markdown or any code fences. Output only JSON.`;

  const resp = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `RFP: ${JSON.stringify(rfp)}\nVendor: ${vendor?.name ?? ""}\nEmail:\n${emailText}`,
      },
    ],
    temperature: 0.0,
    max_tokens: 1200,
  });

  const raw = (resp as any)?.choices?.[0]?.message?.content ?? "";
  // Log raw for debugging (trim)
  console.log("[AI RAW OUTPUT]", raw.slice ? raw.slice(0, 2000) : raw, "...");
  const parsed = await parseModelProposalOutput(raw);
  return {
    _id: nanoid(),
    ...parsed
  }
}

// 3) Compare proposals and recommend vendor
export async function compareProposalsAi(rfp: any, proposalsWithVendor: any[]) {
  const systemPrompt = `
You are helping choose the best vendor for this RFP.
Return ONLY JSON:
{
  "recommendationVendorId": string,
  "explanation": string,
  "scores": [
    { "proposalId": string, "vendorName": string, "score": number, "rationale": string }
  ]
}
Consider: totalPrice (lower better), deliveryTimelineDays (<= RFP), warrantyMonths (>= RFP),
and alignment with paymentTerms.
  `;
  const content = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "system", content: systemPrompt },
    {
      role: "user",
      content: JSON.stringify({
        rfp,
        proposals: proposalsWithVendor
      })
    }]
  });

  const raw = content.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}
