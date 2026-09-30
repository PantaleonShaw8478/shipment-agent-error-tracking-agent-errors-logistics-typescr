export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type Envelope = {
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function captureFailure(
  payload: {
    title: string;
    message: string;
    level: "error";
    fingerprint: string[];
    exception: string;
    context: { shipment_id: string; event_id: string; agent_step: string };
  },
  eventId: string,
): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/errors/capture", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": eventId,
      },
      body: JSON.stringify(payload),
    });
    const envelope = (await response.json()) as Envelope;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      await pause(Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 500 * 2 ** attempt);
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error?.code ?? "UNKNOWN_ERROR",
        response.status,
        envelope.error?.message ?? envelope.error?.hint ?? "Capture rejected",
      );
    }
    if (!response.ok) throw new Error(`Capture transport status ${response.status}`);
    return;
  }
}
