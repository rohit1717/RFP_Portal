// models/Proposal.ts
import mongoose, { Schema, model, type HydratedDocument } from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";
import type { VendorDocument } from "./Vendor.ts";
import type { RfpDocument } from "./Rfp.ts";

export interface IPrice {
    itemName?: string;
    unitPrice?: number;
    totalPrice?: number;
}

export interface IProposal {
    _id: string;
    rfp: string | RfpDocument;
    vendor: string | VendorDocument;
    rawEmail?: string;
    prices?: IPrice[];
    totalPrice?: number;
    deliveryTimelineDays?: number;
    warrantyMonths?: number;
    paymentTerms?: string;
    aiScore?: number;
    aiSummary?: string;
    status?: "received" | "evaluated";
}

export type ProposalDocument = HydratedDocument<IProposal>;

const priceSchema = new Schema<IPrice>({ itemName: String, unitPrice: Number, totalPrice: Number }, { _id: false });

const proposalSchema = new Schema<IProposal>({
    _id: String,
    rfp: { type: String, ref: "Rfp", required: true },
    vendor: { type: String, ref: "Vendor", required: true },
    rawEmail: String,
    prices: [priceSchema],
    totalPrice: Number,
    deliveryTimelineDays: Number,
    warrantyMonths: Number,
    paymentTerms: String,
    aiScore: Number,
    aiSummary: String,
    status: { type: String, enum: ["received", "evaluated"], default: "received" }
}, { timestamps: true });

export const ProposalModel = model<IProposal>("Proposal", proposalSchema);
