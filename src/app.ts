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

  app.get('/', async (_req, reply) => {
  reply.type('text/html').send(`
    <html>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>Page Pulse</h1>
        <p>URL-audit API. See <a href="/health">/health</a> or POST to <code>/v1/audits</code>.</p>
        <footer style="margin-top: 3rem; font-size: 0.9rem;">
          Built for
          <a href="https://digitalheroesco.com" target="_blank" rel="noopener noreferrer">
            Digital Heroes Training Task
          </a>
        </footer>
      </body>
    </html>
  `);
});

  app.register(auditsRoute);

  return app;
};