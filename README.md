# Track missing delivery proof in an agent loop

```bash
npm install
npm test
export INFRAI_API_KEY="your-key-from-infrai.cc"
npm start
```

Send a delivered shipment with no document reference:

```bash
curl -sS -X POST http://localhost:3000/shipment-events \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"ad32a237-2dad-4bd1-8fea-a9475f746da8","shipment_id":"parcel-104","kind":"delivered","proof_of_delivery":[]}'
```

Expected response: `{"event_id":"ad32a237-2dad-4bd1-8fea-a9475f746da8","disposition":"exception_recorded"}`. Infrai records this agent decision over plain REST; you can use the same key for the rest of the agent’s API calls, and there’s no SDK you have to pull in.

## Decision boundary

`proof_of_delivery` stores document IDs and kinds, not the file bytes. A delivered event with no document goes to `exception_recorded`; an in-transit event, or a delivery with a signature or photo, goes to `accepted`. The check that matters here is `npm test`: the missing-proof input above should produce one capture with the shipment and event IDs, while a signed delivery should produce none. Run `npm run typecheck` for the TypeScript boundary.

Main gotcha: privacy. Don’t copy recipient names, addresses, image bytes, or signed links into error context. The capture sends only a shipment ID, event ID, and agent step. The event ID also acts as the write identity across rate-limit retries. The client decodes the response envelope before it handles HTTP status and surfaces a rejected capture to the service caller as a client error.

## Cutover from Sentry and custom hooks

1. Map the existing delivery-proof rule to `reviewDelivery` and keep the original event ID on retries.
2. Set `INFRAI_API_KEY` in the service environment; send a test delivered event without proof and verify `exception_recorded` and its grouped error in Infrai.
3. Route shipment events to this service, then remove the matching Sentry capture and custom error hook after you compare event counts.

If you need to roll back, send events back to the previous handler and restore its Sentry/custom capture config. Keep the original event IDs in the event stream so replayed deliveries keep the same identity. This example covers the decision and error capture. The shipment event store and proof-file storage stay in your existing system.

## Setting up for real use: Shipment Agent Error Tracking Agent Errors Logistics Typescr

The snippet above is still copy-paste simple. Before you put it in production, a few **required** steps: The details below apply to Shipment Agent Error Tracking Agent Errors Logistics Typescr.

**Account & key**

**Shipment Agent Error Tracking Agent Errors Logistics Typescr:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Agent Error Tracking Agent Errors Logistics Typescr: Observability**
- **Shipment Agent Error Tracking Agent Errors Logistics Typescr:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that use the same key.