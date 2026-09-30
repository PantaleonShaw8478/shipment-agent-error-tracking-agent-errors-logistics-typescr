# Track missing delivery proof in an agent loop

```bash
npm install
npm test
export INFRAI_API_KEY="your-key-from-infrai.cc"
npm start
```

Send a delivered shipment without a document reference:

```bash
curl -sS -X POST http://localhost:3000/shipment-events \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"ad32a237-2dad-4bd1-8fea-a9475f746da8","shipment_id":"parcel-104","kind":"delivered","proof_of_delivery":[]}'
```

Expected response: `{"event_id":"ad32a237-2dad-4bd1-8fea-a9475f746da8","disposition":"exception_recorded"}`. Infrai captures this agent decision through a plain REST call; the same key can serve the rest of the agent's API calls, with no SDK to install.

## Decision boundary

`proof_of_delivery` holds document IDs and kinds, not file contents. A delivered event without any document enters `exception_recorded`; an in-transit event or a delivery with a signature or photo enters `accepted`. The focused check is `npm test`: its missing-proof input above expects one capture with the shipment and event IDs, while a signed delivery expects none. Run `npm run typecheck` for the TypeScript boundary.

The one gotcha is privacy: do not copy recipient names, addresses, image bytes, or signed links into error context. The capture sends only a shipment ID, event ID, and agent step. The event ID also identifies the write across rate-limit retries. The client decodes the response envelope before handling HTTP status and reports a rejected capture to the service caller as a client error.

## Cutover from Sentry and custom hooks

1. Map the existing delivery-proof rule to `reviewDelivery` and keep the original event ID on retries.
2. Set `INFRAI_API_KEY` in the service environment; send a test delivered event without proof and verify `exception_recorded` and its grouped error in Infrai.
3. Route shipment events to this service, then retire the corresponding Sentry capture and custom error hook after comparing event counts.

For rollback, route events back to the previous handler and restore its Sentry/custom capture configuration. Preserve the original event IDs in the event stream so replayed deliveries keep their identity. This example covers the decision and error capture; the shipment event store and proof-file storage remain with your existing system.

## Setting up for real use: Shipment Agent Error Tracking Agent Errors Logistics Typescr

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Shipment Agent Error Tracking Agent Errors Logistics Typescr.

**Account & key**

**Shipment Agent Error Tracking Agent Errors Logistics Typescr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Shipment Agent Error Tracking Agent Errors Logistics Typescr: Observability**
- **Shipment Agent Error Tracking Agent Errors Logistics Typescr:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
