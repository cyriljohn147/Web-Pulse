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
      <head>
        <meta charset="utf-8" />
        <title>Page Pulse</title>
        <style>
          body {
            font-family: -apple-system, system-ui, sans-serif;
            max-width: 640px;
            margin: 4rem auto;
            padding: 0 1.5rem;
            color: #1a1a1a;
            line-height: 1.6;
          }
          h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
          .subtitle { color: #666; margin-top: 0; margin-bottom: 2rem; }
          .endpoints {
            background: #f6f6f7;
            border-radius: 8px;
            padding: 1.25rem 1.5rem;
          }
          .endpoint-row {
            display: flex;
            align-items: baseline;
            gap: 0.75rem;
            margin: 0.5rem 0;
          }
          .method {
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            color: white;
            min-width: 42px;
            text-align: center;
          }
          .get { background: #2563eb; }
          .post { background: #16a34a; }
          code {
            background: #eaeaea;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9rem;
          }
          a { color: #2563eb; }
          footer {
            margin-top: 3rem;
            font-size: 0.85rem;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 1.25rem;
          }
        </style>
      </head>
      <body>
        <h1>Page Pulse</h1>
        <p class="subtitle">A URL-audit API — fetches a page and returns status, timing, title, meta description, and H1 count.</p>

        <div class="endpoints">
          <div class="endpoint-row">
            <span class="method get">GET</span>
            <a href="/health"><code>/health</code></a>
          </div>
          <div class="endpoint-row">
            <span class="method post">POST</span>
            <code>/v1/audits</code>
          </div>
        </div>
        <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
          <code>/v1/audits</code> requires a POST request with a JSON body (<code>{ "url": "..." }</code>) and an
          <code>x-client-id</code> header — not clickable from a browser, but works with curl, Postman, or the client of your choice. See the
          <a href="https://github.com/YOUR-USERNAME/YOUR-REPO">README</a> for the full API contract.
        </p>

        <footer>
          Built for
          <a href="https://digitalheroesco.com" target="_blank" rel="noopener noreferrer">Digital Heroes Training Task</a>
        </footer>
      </body>
    </html>
  `);
});

  app.register(auditsRoute);

  return app;
};