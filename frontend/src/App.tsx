import { useEffect, useState } from "react";
import { listRfps, listVendors } from "./api";
import Card from "./components/utils/Card";
import RfpList from "./components/RfpList";
import RfpCreator from "./components/RfpCreator";
import VendorManager from "./components/VendorManager";
import RfpDetail from "./components/RfpDetail";

export default function App() {
    const [rfps, setRfps] = useState<Rfp[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedRfpId, setSelectedRfpId] = useState<string | undefined>(undefined);
    const [tab, setTab] = useState<'rfps' | 'vendors' | 'create'>('rfps');
    const [loading, setLoading] = useState(false);

    async function loadAll() {
        try {
            setLoading(true);
            const [r, v] = await Promise.all([listRfps(), listVendors()]);
            setRfps(r || []);
            setVendors(v || []);
            if (r?.[0]) setSelectedRfpId(r[0]._id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadAll() }, []);

    function onCreated(r: Rfp) {
        setRfps(prev => [r, ...prev]);
        setSelectedRfpId(r._id);
        setTab('rfps');
    }

    function onVendorCreated() { loadAll(); }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                <header className="lg:col-span-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#E8EEF7]">RFP Portal</h1>
                        <p className="text-sm text-gray-500">Create, send and compare vendor proposals — powered by simple AI scoring.</p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setTab('create')} className={`px-3 py-2 rounded ${tab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white shadow'}`}>Create RFP</button>
                        <button onClick={() => setTab('rfps')} className={`px-3 py-2 rounded ${tab === 'rfps' ? 'bg-indigo-600 text-white' : 'bg-white shadow'}`}>RFPs</button>
                        <button onClick={() => setTab('vendors')} className={`px-3 py-2 rounded ${tab === 'vendors' ? 'bg-indigo-600 text-white' : 'bg-white shadow'}`}>Vendors</button>
                    </div>
                </header>

                {/* Left sidebar */}
                <aside className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        {/* Search + Filters */}
                        <Card>
                            <div className="mb-2">
                                <input placeholder="Search RFPs..." className="w-full px-3 py-2 border rounded" onChange={(e) => {
                                    const q = e.target.value.toLowerCase();
                                    if (!q) return loadAll();
                                    setRfps(prev => prev.filter(p => (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)))
                                }} />
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2">RFPs</h4>
                                <RfpList rfps={rfps} onSelect={id => { setSelectedRfpId(id); setTab('rfps') }} />
                            </div>
                        </Card>

                        {/* Vendors mini */}
                        <Card>
                            <h4 className="text-sm font-medium mb-2">Vendors</h4>
                            <div className="space-y-2 max-h-48 overflow-auto">
                                {vendors.map(v => (
                                    <div key={v._id} className="text-sm">{v.name} <div className="text-xs text-gray-400">{v.email}</div></div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </aside>

                {/* Main content area */}
                <main className="lg:col-span-3 space-y-4">
                    {tab === 'create' && (
                        <RfpCreator onCreated={onCreated} />
                    )}

                    {tab === 'vendors' && (
                        <VendorManager vendors={vendors} onVendorCreated={onVendorCreated} />
                    )}

                    {tab === 'rfps' && (
                        <div>
                            <div className="mb-4">
                                <button className="px-3 py-2 bg-gray-200 rounded mr-2" onClick={loadAll}>Refresh</button>
                                <span className="text-sm text-gray-500 ml-2">{rfps.length} RFP(s)</span>
                            </div>

                            <div className="w-full md:max-w-1/2 overflow-auto mx-auto">
                                <RfpDetail rfpId={selectedRfpId} vendors={vendors} onRefreshRfps={loadAll} />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
