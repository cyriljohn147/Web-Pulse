import type { AuditResult } from "./audit-service.js";

type CacheEntry = {
  value: AuditResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

const configuredTtlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? 300);

const cacheTtlMs =
  Number.isFinite(configuredTtlSeconds) && configuredTtlSeconds > 0
    ? configuredTtlSeconds * 1000
    : 300_000;

const getCacheKey = (url: string) => new URL(url).toString();

export const getCachedAudit = (url: string): AuditResult | null => {
  const key = getCacheKey(url);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

export const setCachedAudit = (url: string, audit: AuditResult): void => {
  const key = getCacheKey(url);

  cache.set(key, {
    value: audit,
    expiresAt: Date.now() + cacheTtlMs,
  });
};