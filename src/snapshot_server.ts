import { createServer } from "node:http";
import { InfraiError } from "./infrai_storage.js";
import { storeNightlySnapshot } from "./nonprofit_snapshot.js";
import { snapshotRequestSchema } from "./snapshot_policy.js";

const bucket = process.env.INFRAI_SNAPSHOT_BUCKET ?? "nonprofit-nightly-snapshots";
const port = Number(process.env.PORT ?? 3000);

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/snapshots") {
    send(response, 404, { error: "route_not_found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = snapshotRequestSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) {
      send(response, 400, { error: "invalid_snapshot", issues: parsed.error.issues });
      return;
    }

    const result = await storeNightlySnapshot(bucket, parsed.data);
    send(response, result.status === "created" ? 201 : 200, result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      send(response, 400, { error: "invalid_json" });
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      send(response, error.status, { error: error.code, message: error.message });
      return;
    }
    console.error(error);
    send(response, 502, { error: "snapshot_storage_error" });
  }
});

server.listen(port, () => {
  console.log(`Snapshot service listening on http://localhost:${port}`);
});
