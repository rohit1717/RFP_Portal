// src/models/Vendor.ts
import mongoose, { model, Model, type HydratedDocument } from "mongoose";

export interface IVendor {
    _id: string;
    name: string;
    email?: string;
    rating?: number;
    notes?: string;
}

export type VendorDocument = HydratedDocument<IVendor>;

const vendorSchema = new mongoose.Schema(
    {
        _id: String,
        name: { type: String, required: true },
        email: String,
        rating: Number,
        notes: String,
    },
    { timestamps: true }
);


// Safely export model (reuse existing model if present)
export const VendorModel: Model<IVendor> =
    (mongoose.models?.Vendor as Model<IVendor>) || model<IVendor>("Vendor", vendorSchema);
