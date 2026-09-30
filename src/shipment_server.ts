import { createServer } from "node:http";
import { ZodError } from "zod";
import { captureFailure, InfraiError } from "./infrai_errors.ts";
import { reviewDelivery, shipmentEvent } from "./shipment_loop.ts";

const server = createServer(async (request, response) => {
  const send = (status: number, body: object) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method !== "POST" || request.url !== "/shipment-events") {
    send(404, { error: "Route not found" });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const event = shipmentEvent.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    send(200, await reviewDelivery(event, captureFailure));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(400, { error: "Invalid shipment event" });
    } else if (error instanceof InfraiError) {
      send(error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code,
        message: error.message,
      });
    } else {
      send(502, { error: "Unable to record shipment event" });
    }
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Shipment event service listening on ${process.env.PORT ?? 3000}`);
});
