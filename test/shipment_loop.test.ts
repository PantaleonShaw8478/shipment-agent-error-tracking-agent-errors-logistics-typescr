import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewDelivery, shipmentEvent } from "../src/shipment_loop.ts";

test("delivered event without proof records a redacted exception", async () => {
  const event = shipmentEvent.parse({
    event_id: "ad32a237-2dad-4bd1-8fea-a9475f746da8",
    shipment_id: "parcel-104",
    kind: "delivered",
    proof_of_delivery: [],
  });
  const calls: unknown[] = [];
  const result = await reviewDelivery(event, async (payload, id) => {
    calls.push({ payload, id });
  });
  assert.deepEqual(result, { event_id: event.event_id, disposition: "exception_recorded" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    payload: {
      title: "Delivery proof missing",
      message: "Delivered shipment has no proof-of-delivery document",
      level: "error",
      fingerprint: ["shipment-agent", "verify-delivery-proof"],
      exception: "MissingProofOfDelivery: delivered event has no document reference",
      context: { shipment_id: "parcel-104", event_id: event.event_id, agent_step: "verify-delivery-proof" },
    },
    id: event.event_id,
  });
});

test("a signed delivery does not capture an exception", async () => {
  const event = shipmentEvent.parse({
    event_id: "66d78efc-04ef-44fc-9da8-d69b9fa66e53",
    shipment_id: "parcel-105",
    kind: "delivered",
    proof_of_delivery: [{ document_id: "proof-1", kind: "signature" }],
  });
  const result = await reviewDelivery(event, async () => {
    assert.fail("verified delivery should not produce an error");
  });
  assert.equal(result.disposition, "accepted");
});
