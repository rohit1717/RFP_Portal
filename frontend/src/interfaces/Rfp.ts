interface Rfp {
    _id: string;
    title?: string;
    description?: string;
    budget?: number;
    deliveryTimelineDays?: number;
    paymentTerms?: string;
    warrantyMonths?: number;
    items?: RfpItem[];
    status?: string;
    [key: string]: any;
}