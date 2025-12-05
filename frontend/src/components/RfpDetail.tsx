import React, { useEffect, useState, useCallback } from "react";
import { getRfp, sendRfp, getComparison } from "../api";


interface RfpDetailProps {
    rfpId?: string | null;
    vendors: Vendor[];
    onRefreshRfps?: () => void;
}

export default function RfpDetail({
    rfpId,
    vendors,
    onRefreshRfps,
}: RfpDetailProps) {
    const [rfp, setRfp] = useState<Rfp | null>(null);
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [comparison, setComparison] = useState<Comparison | null>(null);

    // merged loading object so UI can show multiple concurrent statuses
    const [loading, setLoading] = useState({
        fetch: false,
        send: false,
        compare: false,
    });

    // helper to merge loading state
    const setLoadingState = useCallback(
        (patch: Partial<typeof loading>) => {
            setLoading((prev) => ({ ...prev, ...patch }));
        },
        []
    );

    // fetch RFP from API using rfpId
    const loadRfp = useCallback(
        async (id?: string | null) => {
            if (!id) return;
            try {
                setLoadingState({ fetch: true });
                const data = await getRfp(id);
                setRfp(data);
                setComparison(null); // reset comparison whenever we load a new RFP
                setSelectedVendorIds([]); // reset selected vendors
            } catch (err) {
                console.error("Failed to load RFP", err);
                setRfp(null);
            } finally {
                setLoadingState({ fetch: false });
            }
        },
        [setLoadingState]
    );

    useEffect(() => {
        if (!rfpId) {
            setRfp(null);
            setComparison(null);
            setSelectedVendorIds([]);
            return;
        }
        void loadRfp(rfpId);
    }, [rfpId, loadRfp]);

    function toggleVendor(id: string) {
        setSelectedVendorIds((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
        );
    }

    // send RFP to selected vendors
    async function handleSend() {
        if (!rfp || !selectedVendorIds.length) {
            alert("Select at least one vendor to send the RFP.");
            return;
        }
        try {
            setLoadingState({ send: true });
            await sendRfp(rfp._id, selectedVendorIds);
            alert("RFP sent to selected vendors.");
            // refresh parent list if provided
            if (onRefreshRfps) onRefreshRfps();
        } catch (err) {
            console.error("Failed to send RFP", err);
            alert("Failed to send RFP. See console for details.");
        } finally {
            setLoadingState({ send: false });
        }
    }

    // run AI comparison for proposals
    async function handleCompare() {
        if (!rfp) return;
        try {
            setLoadingState({ compare: true });
            const data = await getComparison(rfp._id);
            setComparison(data ?? null);
        } catch (err) {
            console.error("Failed to compare proposals", err);
            alert("Failed to run comparison. See console for details.");
            setComparison(null);
        } finally {
            setLoadingState({ compare: false });
        }
    }

    // UI: loading skeleton / spinner
    if (loading.fetch) {
        return (
            <div className="w-full p-6 bg-white rounded shadow">
                <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="h-32 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    if (!rfp) {
        return (
            <div className="p-6 bg-white rounded shadow text-center text-gray-500">
                Select an RFP to view details
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* LEFT COLUMN: allow shrinking with min-w-0 */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-semibold">
                        {rfp.title ?? "(Untitled RFP)"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{rfp.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-gray-700">
                        <div>
                            <span className="text-gray-500">Budget:</span>{" "}
                            <span className="font-medium">${rfp.budget ?? 0}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Delivery:</span>{" "}
                            <span className="font-medium">
                                {rfp.deliveryTimelineDays ?? "N/A"} days
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Payment:</span>{" "}
                            <span className="font-medium">
                                {rfp.paymentTerms ?? "N/A"}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Warranty:</span>{" "}
                            <span className="font-medium">
                                {rfp.warrantyMonths ?? 0} months
                            </span>
                        </div>
                    </div>

                    <div className="mt-5">
                        <h4 className="font-medium">Items</h4>
                        <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                            {(rfp.items ?? []).length === 0 && (
                                <li className="text-gray-400">No items listed for this RFP.</li>
                            )}
                            {(rfp.items ?? []).map((i: RfpItem, idx: number) => (
                                <li key={idx}>
                                    {i.quantity ?? 1} x {i.name}{" "}
                                    {i.specs ? `(${i.specs})` : null}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* RIGHT COLUMN (aside): keep min-w-0 so it behaves on small screens */}
                <aside className="w-full md:w-80 min-w-0">
                    <div className="mb-4">
                        <h4 className="font-medium mb-2">Send to Vendors</h4>

                        <div className="max-h-48 overflow-auto space-y-2 p-2 border rounded">
                            {vendors.length === 0 && (
                                <div className="text-sm text-gray-400">
                                    No vendors available. Add vendors to send this RFP.
                                </div>
                            )}
                            {vendors.map((v) => (
                                <label
                                    key={v._id}
                                    className="flex items-center gap-3 p-1 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedVendorIds.includes(v._id)}
                                        onChange={() => toggleVendor(v._id)}
                                        className="h-4 w-4"
                                    />
                                    <div className="text-sm">
                                        <div className="font-medium">{v.name}</div>
                                        <div className="text-xs text-gray-400">{v.email}</div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!selectedVendorIds.length || loading.send}
                            className="mt-3 w-full px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading.send ? "Sending..." : `Send RFP (${selectedVendorIds.length || 0})`}
                        </button>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Comparison</h4>
                        <button
                            onClick={handleCompare}
                            disabled={loading.compare}
                            className="w-full px-3 py-2 rounded bg-amber-500 text-white disabled:opacity-60"
                        >
                            {loading.compare ? "Comparing..." : "Run AI Comparison"}
                        </button>
                    </div>
                </aside>
            </div>

            {/* comparison results */}
            {comparison ? (
                <div className="mt-6">
                    <h4 className="text-lg font-semibold">Recommendation</h4>
                    <p className="text-sm text-gray-600 mt-2 break-words max-w-[30rem] sm:max-w-[48rem] whitespace-normal">
                        {comparison.ai?.explanation ?? "No explanation available."}
                    </p>

                    {/* Make table scroll horizontally if needed and fsorce wrapping in rationale */}
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b">
                                    <th className="py-2 pr-4 w-36">Vendor</th>
                                    <th className="py-2 pr-4 w-20">Score</th>
                                    {/* small max widths so rationale wraps early; responsive increase on sm */}
                                    <th className="py-2">Rationale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparison.ai?.scores?.length ? (
                                    comparison.ai.scores.map((s: ComparisonScore) => (
                                        <tr key={s.proposalId} className="border-b hover:bg-gray-50 align-top">
                                            <td className="py-2 pr-4 truncate" title={s.vendorName}>
                                                {s.vendorName}
                                            </td>
                                            <td className="py-2 pr-4 font-medium">{s.score}</td>
                                            <td
                                                className="py-2 text-gray-600 whitespace-normal break-words max-w-[14rem] sm:max-w-[24rem]"
                                                // optional: show full rationale on hover
                                                title={s.rationale}
                                            >
                                                {s.rationale ?? "—"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-400">
                                            No scores returned from comparison.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="mt-6 text-sm text-gray-400">
                    No comparison available. Run AI Comparison to generate scores.
                </div>
            )}
        </div>
    );

}
