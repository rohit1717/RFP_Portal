const BASE_URL =
    import.meta.env.VITE_BASE_URL || "http://localhost:4000/api";

/** helper to validate response and parse JSON with a typed return */
async function handleRes<T>(res: Response, errMsg = "Request failed"): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        const body = text ? `: ${text}` : "";
        throw new Error(`${errMsg}${body}`);
    }
    return (await res.json()) as T;
}

/** API functions */

export async function createRfpFromText(description: string): Promise<Rfp> {
    const res = await fetch(`${BASE_URL}/rfps/from-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
    });
    return handleRes<Rfp>(res, "Failed to create RFP");
}

export async function listRfps(): Promise<Rfp[]> {
    const res = await fetch(`${BASE_URL}/rfps`);
    return handleRes<Rfp[]>(res, "Failed to list RFPs");
}

export async function getRfp(id: string): Promise<Rfp> {
    const res = await fetch(`${BASE_URL}/rfps/${encodeURIComponent(id)}`);
    return handleRes<Rfp>(res, "Failed to get RFP");
}

export async function sendRfp(id: string, vendorIds: string[]): Promise<{ success?: boolean;[key: string]: any }> {
    const res = await fetch(`${BASE_URL}/rfps/${encodeURIComponent(id)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorIds }),
    });
    return handleRes(res, "Failed to send RFP");
}

export async function getComparison(id: string): Promise<Comparison> {
    const res = await fetch(`${BASE_URL}/rfps/${encodeURIComponent(id)}/comparison`);
    return handleRes<Comparison>(res, "Failed to compare");
}

/** Vendors */

export async function listVendors(): Promise<Vendor[]> {
    const res = await fetch(`${BASE_URL}/vendors`);
    return handleRes<Vendor[]>(res, "Failed to list vendors");
}

export async function createVendor(vendor: Partial<Vendor> & { name: string; email?: string }): Promise<Vendor> {
    const res = await fetch(`${BASE_URL}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendor),
    });
    return handleRes<Vendor>(res, "Failed to create vendor");
}
