import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AuditServiceError, auditUrl } from "../services/audit-service.js";
import {
  getCachedAudit,
  setCachedAudit,
} from "../services/cache-service.js";

const auditBodySchema = z.object({
  url: z.string().trim().url().max(2048),
});

export const auditsRoute: FastifyPluginAsync = async (app) => {
  app.post("/v1/audits", async (request, reply) => {
    const result = auditBodySchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({
        requestId: request.id,
        error: {
          code: "VALIDATION_ERROR",
          message: "url must be a valid URL and no longer than 2048 characters",
        },
      });
    }

    const url = new URL(result.data.url);

    request.log.info(
      {
        event: "audit_requested",
        host: url.hostname,
      },
      "Audit requested",
    );

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return reply.code(400).send({
        requestId: request.id,
        error: {
          code: "VALIDATION_ERROR",
          message: "url must use http or https",
        },
      });
    }

    const cachedAudit = getCachedAudit(url.toString());

    if (cachedAudit) {
      request.log.info(
        {
          event: "audit_cache_hit",
          host: url.hostname,
        },
        "Audit served from cache",
      );

      return reply.code(200).send({
        requestId: request.id,
        cached: true,
        data: cachedAudit,
      });
    }

    try {
      const audit = await auditUrl(url.toString());

      setCachedAudit(url.toString(), audit);

      request.log.info(
        {
          event: "audit_completed",
          host: url.hostname,
          statusCode: audit.statusCode,
          responseTimeMs: audit.responseTimeMs,
        },
        "Audit completed",
      );

      return reply.code(200).send({
        requestId: request.id,
        cached: false,
        data: audit,
      });
    } catch (error) {
      const auditError =
        error instanceof AuditServiceError
          ? error
          : new AuditServiceError(
              "FETCH_FAILED",
              "The audit could not be completed",
              502,
            );

      request.log.warn(
        {
          event: "audit_failed",
          host: url.hostname,
          code: auditError.code,
        },
        "Audit failed",
      );

      return reply.code(auditError.statusCode).send({
        requestId: request.id,
        error: {
          code: auditError.code,
          message: auditError.message,
        },
      });
    }
  });
};