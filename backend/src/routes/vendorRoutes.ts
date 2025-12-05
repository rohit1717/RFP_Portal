import { Router, type Request, type Response } from "express";
import { VendorModel } from "../models/Vendor.js";
import { nanoid } from "nanoid";

const router = Router();

/**
 * GET /api/vendors
 * returns list of vendors
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const vendors = await VendorModel.find().sort({ createdAt: -1 }).lean();
        return res.json(vendors);
    } catch (err: any) {
        console.error("GET /api/vendors error:", err);
        return res.status(500).json({ error: "Failed to fetch vendors" });
    }
});

/**
 * POST /api/vendors
 * body: { name: string, email: string, rating?: number, notes?: string }
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, rating, notes } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: "name and email are required" });
        }

        // simple duplication guard
        const existing = await VendorModel.findOne({ email }).lean();
        if (existing) {
            return res.status(409).json({ error: "Vendor with this email already exists" });
        }
        const _id = nanoid();

        const vendor = await VendorModel.create({ _id, name, email, rating, notes });
        return res.status(201).json(vendor);
    } catch (err: any) {
        console.error("POST /api/vendors error:", err);
        return res.status(500).json({ error: "Failed to create vendor" });
    }
});

/**
 * GET /api/vendors/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "Vendor ID is required" });
        }
        const vendor = await VendorModel.findById(Number(id)).lean();
        if (!vendor) return res.status(404).json({ error: "Vendor not found" });
        return res.json(vendor);
    } catch (err: any) {
        console.error("GET /api/vendors/:id error:", err);
        return res.status(500).json({ error: "Failed to fetch vendor" });
    }
});

/**
 * PUT /api/vendors/:id
 * update vendor fields
 */
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "Vendor ID is required" });
        }
        const update = req.body;
        const vendor = await VendorModel.findByIdAndUpdate(Number(id), update, { new: true }).lean();
        if (!vendor) return res.status(404).json({ error: "Vendor not found" });
        return res.json(vendor);
    } catch (err: any) {
        console.error("PUT /api/vendors/:id error:", err);
        return res.status(500).json({ error: "Failed to update vendor" });
    }
});

/**
 * DELETE /api/vendors/:id
 */
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "Vendor ID is required" });
        }
        await VendorModel.findByIdAndDelete(Number(id));
        return res.json({ message: "Vendor deleted" });
    } catch (err: any) {
        console.error("DELETE /api/vendors/:id error:", err);
        return res.status(500).json({ error: "Failed to delete vendor" });
    }
});

export default router;
