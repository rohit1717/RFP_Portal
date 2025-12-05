// src/models/Rfp.ts
import mongoose, { Schema, model, Model, type HydratedDocument } from "mongoose";

export interface IRfpItem {
    name?: string;
    quantity?: number;
    specs?: string;
}

export interface IRfp {
    _id: string;
    title?: string;
    description?: string;
    budget?: number;
    deliveryTimelineDays?: number;
    items?: IRfpItem[];
    paymentTerms?: string;
    warrantyMonths?: number;
    status?: "draft" | "sent" | "evaluating" | "closed";
    createdAt?: Date;
    updatedAt?: Date;
}

export type RfpDocument = HydratedDocument<IRfp>;

const itemSchema = new Schema({ name: String, quantity: Number, specs: String }, { _id: false });

const rfpSchema = new Schema<IRfp>(
    {
        _id: String,
        title: String,
        description: String,
        budget: Number,
        deliveryTimelineDays: Number,
        items: [itemSchema],
        paymentTerms: String,
        warrantyMonths: Number,
        status: { type: String, enum: ["draft", "sent", "evaluating", "closed"], default: "draft" },
    },
    { timestamps: true }
);
export const RfpModel: Model<IRfp> =
    (mongoose.models?.Rfp as Model<IRfp>) || model<IRfp>("Rfp", rfpSchema);
