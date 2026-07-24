import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { auditsRoute } from "./routes/audits.js";

export const buildApp = () => {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
  });

  app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 20),
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      const clientId = request.headers["x-client-id"];

      if (typeof clientId === "string" && clientId.trim()) {
        return `client:${clientId}`;
      }

      return `ip:${request.ip}`;
    },
    errorResponseBuilder: (request) => ({
      requestId: request.id,
      error: {
        code: "RATE_LIMITED",
        message: "Too many audit requests. Please try again later.",
      },
    }),
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "page-pulse",
    };
  });

  app.register(auditsRoute);

  return app;
};