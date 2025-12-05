import { nanoid } from "nanoid/non-secure";
import { RfpModel } from "../models/Rfp.js";
import { parseRfpFromText } from "./aiService.js";

export async function createRfpFromText(userText: string) {
    const structured = await parseRfpFromText(userText);

    structured._id = nanoid();
    const rfp = await RfpModel.create(structured);
    return rfp;
}

export async function listRfps() {
    return RfpModel.find().sort({ createdAt: -1 });
}

export async function getRfpById(id: string) {
    return RfpModel.findById(id);
}
