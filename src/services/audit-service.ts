import { load } from "cheerio";
import pLimit from "p-limit";

export type AuditResult = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
};

export class AuditServiceError extends Error {
  constructor(
    public readonly code:
      | "REQUEST_TIMEOUT"
      | "FETCH_FAILED"
      | "UNSUPPORTED_CONTENT_TYPE",
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

const maxConcurrentAudits = Number(
  process.env.MAX_CONCURRENT_AUDITS ?? 5,
);

const auditLimiter = pLimit(maxConcurrentAudits);

export const performAudit = async (url: string): Promise<AuditResult> => {
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "user-agent": "PagePulse/1.0 URL Audit",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const responseTimeMs = Math.round(performance.now() - startedAt);
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      throw new AuditServiceError(
        "UNSUPPORTED_CONTENT_TYPE",
        "The URL did not return an HTML page",
        422,
      );
    }

    const html = await response.text();
    const $ = load(html);

    const title = $("title").first().text().trim() || null;
    const metaDescription =
      $('meta[name="description"]').first().attr("content")?.trim() || null;

    return {
      requestedUrl: url,
      finalUrl: response.url,
      statusCode: response.status,
      responseTimeMs,
      title,
      metaDescription,
      h1Count: $("h1").length,
    };
  } catch (error) {
    if (error instanceof AuditServiceError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AuditServiceError(
        "REQUEST_TIMEOUT",
        "The target website did not respond within 10 seconds",
        408,
      );
    }

    throw new AuditServiceError(
      "FETCH_FAILED",
      "The target website could not be reached",
      502,
    );
  }
};

export const auditUrl = async (url: string): Promise<AuditResult> => {
  return auditLimiter(() => performAudit(url));
};