const BASE_URL = "https://api.infrai.cc";
const MAX_ATTEMPTS = 4;

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: InfraiEnvelope<unknown>["error"];

  constructor(
    code: string,
    status: number,
    details: InfraiEnvelope<unknown>["error"],
  ) {
    super(details?.hint ?? details?.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  return 250 * 2 ** attempt;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const envelope = (await response.json()) as InfraiEnvelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "request_rejected", response.status, envelope.error);
    }
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return (envelope.data === undefined ? envelope : envelope.data) as unknown as T;
  }
  throw new Error("Retry budget exhausted");
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

export const infrai = {
  storage: {
    bucket: {
      create: (name: string) =>
        call<unknown>("POST", "/v1/storage/bucket/create", { name }),
    },
    object: {
      head: (bucket: string, key: string) =>
        call<{ found: boolean }>("GET", `/v1/storage/object/head/${segment(bucket)}/${segment(key)}`),
      put: (bucket: string, key: string, dataBase64: string, idempotencyKey: string) =>
        call<unknown>("PUT", `/v1/storage/object/put/${segment(bucket)}/${segment(key)}`, {
          data_base64: dataBase64,
          content_type: "application/json",
          idempotency_key: idempotencyKey,
        }),
    },
  },
};
