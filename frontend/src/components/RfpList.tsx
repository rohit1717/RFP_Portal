import Empty from "./utils/Empty";

export default function RfpList({ rfps, onSelect }: { rfps: Rfp[]; onSelect: (id: string) => void }) {
    if (!rfps.length) return <Empty text="No RFPs yet. Create one or upload." />;


    return (
        <ul className="space-y-2">
            {rfps.map((r) => (
                <li key={r._id}>
                    <button
                        onClick={() => onSelect(r._id)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center justify-between"
                    >
                        <div>
                            <div className="font-medium">{r.title || "(Untitled)"}</div>
                            <div className="text-xs text-gray-400">${r.budget ?? 0} • {r.status ?? "Draft"}</div>
                        </div>
                        <div className="text-xs text-gray-500">View</div>
                    </button>
                </li>
            ))}
        </ul>
    );
}