import assert from "node:assert/strict";
import test from "node:test";
import { decideSnapshot, snapshotRequestSchema, summarizeSnapshot } from "../src/snapshot_policy.js";

test("skips an existing nightly snapshot and preserves reporting totals", () => {
  const input = snapshotRequestSchema.parse({
    businessDate: "2026-09-27",
    receipts: [
      { donorReference: "donor-17", amountCents: 2500, issuedAt: "2026-09-27T10:00:00.000Z" },
      { donorReference: "donor-42", amountCents: 7500, issuedAt: "2026-09-27T12:00:00.000Z" },
    ],
    volunteerReminders: [
      { volunteerReference: "volunteer-8", channel: "email", scheduledFor: "2026-09-28T08:00:00.000Z" },
    ],
    campaigns: [
      { campaignReference: "fall-clinic", raisedCents: 10000, donorCount: 2 },
    ],
  });

  assert.equal(decideSnapshot(true), "skipped");
  assert.deepEqual(summarizeSnapshot(input), {
    businessDate: "2026-09-27",
    receiptCount: 2,
    receiptTotalCents: 10000,
    reminderCount: 1,
    campaignCount: 1,
  });
});
