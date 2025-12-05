import { ProposalModel } from "../models/Proposal.js";
import { extractProposalFromEmail, compareProposalsAi } from "./aiService.js";
import { RfpModel } from "../models/Rfp.js";
import { VendorModel, type VendorDocument } from "../models/Vendor.js";

export async function createProposalFromEmail(rfpId: string, vendorEmail: string, emailText: string) {
  const rfp = await RfpModel.findById(rfpId).exec();
  const vendor = await VendorModel.findOne({ email: vendorEmail }).exec();
  if (!rfp || !vendor) throw new Error("RFP or Vendor not found");
  const parsed = await extractProposalFromEmail(rfp, vendor, emailText);

  const toSave = {
    _id: parsed._id,
    rfp: String(rfp._id),
    vendor: String(vendor._id),
    rawEmail: emailText,
    prices: parsed.prices ?? [],
    totalPrice: parsed.totalPrice ?? null,
    deliveryTimelineDays: parsed.deliveryTimelineDays ?? null,
    warrantyMonths: parsed.warrantyMonths ?? null,
    paymentTerms: parsed.paymentTerms ?? "",
    aiScore: undefined,
    aiSummary: undefined,
    status: "received"
  };

  const proposalDoc = new ProposalModel(toSave);
  const proposal = await proposalDoc.save();

  return proposal;
}

export async function compareProposals(rfpId: string) {
  const rfp = await RfpModel.findById(rfpId);
  if (!rfp) {
    throw new Error(`RFP ${rfpId} not found`);
  }

  const proposals = await ProposalModel.find({ rfp: rfpId })
    .populate<{ vendor: VendorDocument }>("vendor");

  // If no proposals exist, return an empty AI object
  if (!proposals.length) {
    return {
      rfp,
      proposals: [],
      ai: {
        recommendationVendorId: null,
        explanation: "No vendor proposals have been submitted yet.",
        scores: []
      }
    };
  }

  const proposalsWithVendor = proposals.map(p => ({
    proposalId: p._id.toString(),
    vendorId: p.vendor._id.toString(),
    vendorName: p.vendor.name,
    totalPrice: p.totalPrice,
    deliveryTimelineDays: p.deliveryTimelineDays,
    warrantyMonths: p.warrantyMonths,
    paymentTerms: p.paymentTerms
  }));

  const aiResult = await compareProposalsAi(rfp, proposalsWithVendor);

  // Only try saving scores if AI returned any
  if (Array.isArray(aiResult.scores)) {
    for (const s of aiResult.scores) {
      await ProposalModel.findByIdAndUpdate(s.proposalId, {
        aiScore: s.score,
        aiSummary: s.rationale,
        status: "evaluated"
      });
    }
  }

  return {
    rfp,
    proposals,
    ai: aiResult
  };
}

