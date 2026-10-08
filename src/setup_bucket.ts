import { infrai } from "./infrai_storage.js";

const bucket = process.env.INFRAI_SNAPSHOT_BUCKET ?? "nonprofit-nightly-snapshots";

await infrai.storage.bucket.create(bucket);
console.log(JSON.stringify({ ready: true, bucket }));
