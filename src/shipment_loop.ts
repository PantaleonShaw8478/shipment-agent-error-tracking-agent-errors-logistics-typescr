import { z } from "zod";

export const shipmentEvent = z.object({
  event_id: z.string().uuid(),
  shipment_id: z.string().min(1),
  kind: z.enum(["in_transit", "delivered", "exception"]),
  proof_of_delivery: z.array(z.object({
    document_id: z.string().min(1),
    kind: z.enum(["signature", "photo"]),
  })).default([]),
}).strict();

export type ShipmentEvent = z.infer<typeof shipmentEvent>;
export type Capture = (payload: {
  title: string;
  message: string;
  level: "error";
  fingerprint: string[];
  exception: string;
  context: { shipment_id: string; event_id: string; agent_step: string };
}, eventId: string) => Promise<void>;

export async function reviewDelivery(event: ShipmentEvent, capture: Capture) {
  if (event.kind !== "delivered" || event.proof_of_delivery.length > 0) {
    return { event_id: event.event_id, disposition: "accepted" as const };
  }

  await capture({
    title: "Delivery proof missing",
    message: "Delivered shipment has no proof-of-delivery document",
    level: "error",
    fingerprint: ["shipment-agent", "verify-delivery-proof"],
    exception: "MissingProofOfDelivery: delivered event has no document reference",
    context: {
      shipment_id: event.shipment_id,
      event_id: event.event_id,
      agent_step: "verify-delivery-proof",
    },
  }, event.event_id);

  return { event_id: event.event_id, disposition: "exception_recorded" as const };
}
