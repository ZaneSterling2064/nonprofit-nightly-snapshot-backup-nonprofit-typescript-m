import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const snapshotRequestSchema = z.object({
  businessDate: z.string().regex(isoDate),
  receipts: z.array(z.object({
    donorReference: z.string().min(1),
    amountCents: z.number().int().nonnegative(),
    issuedAt: z.string().datetime(),
  })),
  volunteerReminders: z.array(z.object({
    volunteerReference: z.string().min(1),
    channel: z.enum(["email", "sms"]),
    scheduledFor: z.string().datetime(),
  })),
  campaigns: z.array(z.object({
    campaignReference: z.string().min(1),
    raisedCents: z.number().int().nonnegative(),
    donorCount: z.number().int().nonnegative(),
  })),
}).strict();

export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

export function snapshotKey(businessDate: string): string {
  return `nightly/${businessDate}.json`;
}

export function summarizeSnapshot(input: SnapshotRequest) {
  return {
    businessDate: input.businessDate,
    receiptCount: input.receipts.length,
    receiptTotalCents: input.receipts.reduce((sum, receipt) => sum + receipt.amountCents, 0),
    reminderCount: input.volunteerReminders.length,
    campaignCount: input.campaigns.length,
  };
}

export function decideSnapshot(found: boolean): "created" | "skipped" {
  return found ? "skipped" : "created";
}
