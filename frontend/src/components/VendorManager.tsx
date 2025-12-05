import React, { useState } from "react";
import { createVendor } from "../api";

interface VendorManagerProps {
    vendors: Vendor[];
    onVendorCreated: () => void;
}

export default function VendorManager({ vendors, onVendorCreated }: VendorManagerProps) {
    const [form, setForm] = useState<{ name: string; email: string }>({
        name: "",
        email: "",
    });
    const [loading, setLoading] = useState<boolean>(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        try {
            setLoading(true);
            await createVendor(form);
            setForm({ name: "", email: "" });
            onVendorCreated();
        } catch {
            alert("Failed to create vendor");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4 flex flex-col sm:flex-row gap-3">
                <input
                    name="name"
                    placeholder="Vendor name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="flex-1 px-3 py-2 rounded-lg border border-[#A8BCD6] bg-[#F8FBFF]
               focus:outline-none focus:ring-2 focus:ring-[#8EA4C8] focus:border-[#8EA4C8]
               text-[#2A3B4F]"
                />

                <input
                    name="email"
                    placeholder="Vendor email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="flex-1 px-3 py-2 rounded-lg border border-[#A8BCD6] bg-[#F8FBFF]
               focus:outline-none focus:ring-2 focus:ring-[#8EA4C8] focus:border-[#8EA4C8]
               text-[#2A3B4F]"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium
               hover:bg-amber-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Adding..." : "Add Vendor"}
                </button>
            </form>


            <ul>
                {vendors.map((v) => (
                    <li key={v._id} className="text-sm font-italic text-[#E8EEF7]">
                        {v.name} – {v.email}
                    </li>
                ))}
            </ul>
        </div>
    );
}
