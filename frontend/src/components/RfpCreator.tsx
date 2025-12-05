import React, { useState } from "react";
import {
    createRfpFromText
} from "../api";
import Card from "./utils/Card";

export default function RfpCreator({ onCreated }: { onCreated: (r: Rfp) => void }) {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);


    async function handleCreate() {
        if (!text.trim()) return alert("Please provide RFP text or upload a file.");
        try {
            setLoading(true);
            const rfp = await createRfpFromText(text);
            onCreated(rfp);
            setText("");
            setTitle("");
        } catch (e) {
            console.error(e);
            alert("Failed to create RFP");
        } finally {
            setLoading(false);
        }
    }


    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const txt = await file.text();
        setText(txt);
    }


    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Create RFP</h3>
                <p className="text-sm text-gray-400">Paste a description or upload a text/pdf</p>
            </div>


            <input
                className="w-full mb-2 px-3 py-2 border rounded focus:outline-none focus:ring"
                placeholder="Optional title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />


            <textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring resize-none"
                placeholder="Describe what you want to buy in natural language..."
            />


            <div className="flex items-center gap-2 mt-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="file" accept=".txt,.md,.pdf" onChange={handleUpload} className="hidden" />
                    <span className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">Upload file</span>
                </label>


                <button
                    className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
                    disabled={loading || !text.trim()}
                    onClick={handleCreate}
                >
                    {loading ? "Creating..." : "Create RFP"}
                </button>
            </div>
        </Card>
    );
}