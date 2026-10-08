import { infrai } from "./infrai_storage.js";
import {
  decideSnapshot,
  snapshotKey,
  summarizeSnapshot,
  type SnapshotRequest,
} from "./snapshot_policy.js";

export type SnapshotResult = {
  status: "created" | "skipped";
  key: string;
  summary: ReturnType<typeof summarizeSnapshot>;
};

export async function storeNightlySnapshot(
  bucket: string,
  input: SnapshotRequest,
): Promise<SnapshotResult> {
  const key = snapshotKey(input.businessDate);
  const summary = summarizeSnapshot(input);
  const existing = await infrai.storage.object.head(bucket, key);
  const status = decideSnapshot(existing.found);

  if (status === "created") {
    const document = JSON.stringify({ schemaVersion: 1, capturedAt: new Date().toISOString(), summary, ...input });
    await infrai.storage.object.put(
      bucket,
      key,
      Buffer.from(document, "utf8").toString("base64"),
      `nonprofit-snapshot-${input.businessDate}`,
    );
  }

  return { status, key, summary };
}
