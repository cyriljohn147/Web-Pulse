
# Page Pulse

Page Pulse is a URL-audit API built for the Digital Heroes SDE qualification task. It fetches an HTML page and returns basic technical signals such as HTTP status, response time, title, meta description, and H1 count.

## Features

- Validates HTTP(S) URLs
- Enforces a 10-second fetch timeout
- Limits concurrent audits
- Caches repeat audits for a configurable time window
- Limits requests per client or IP address
- Returns structured JSON errors with request IDs
- Writes structured logs for audit lifecycle events
- Includes automated tests and GitHub Actions CI

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The API starts at `http://localhost:3000`.

## API

### Health check

```http
GET /health
```

### Run an audit

```http
POST /v1/audits
Content-Type: application/json
x-client-id: your-client-id
```

Request body:

```json
{
  "url": "https://example.com"
}
```

Successful response:

```json
{
  "requestId": "req-1",
  "cached": false,
  "data": {
    "requestedUrl": "https://example.com",
    "finalUrl": "https://example.com/",
    "statusCode": 200,
    "responseTimeMs": 420,
    "title": "Example Domain",
    "metaDescription": null,
    "h1Count": 1
  }
}
```

Error response:

```json
{
  "requestId": "req-2",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "url must be a valid URL and no longer than 2048 characters"
  }
}
```

Possible error codes:

- `VALIDATION_ERROR`
- `REQUEST_TIMEOUT`
- `UNSUPPORTED_CONTENT_TYPE`
- `FETCH_FAILED`
- `RATE_LIMITED`

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port for the API server |
| `MAX_CONCURRENT_AUDITS` | `5` | Maximum simultaneous outbound audits |
| `CACHE_TTL_SECONDS` | `300` | How long a completed audit remains cached |
| `RATE_LIMIT_MAX` | `20` | Maximum requests per client per minute |

## Commands

```bash
npm run dev
npm run build
npm start
npm test
```

## Testing and CI

Vitest covers the health endpoint, URL validation, protocol validation, successful audit parsing, and cache behaviour.

GitHub Actions installs dependencies, builds the project, and runs tests on every push and pull request.

## Architecture

- `src/app.ts` configures Fastify, rate limiting, and routes.
- `src/routes/audits.ts` validates requests and sends structured responses.
- `src/services/audit-service.ts` fetches and parses target HTML.
- `src/services/cache-service.ts` provides time-based caching.
- `tests/` contains automated API tests.

## Development note

The current cache and rate-limit state are stored in process memory for local development. Before production deployment, they will be moved to Redis so they work consistently across multiple app instances.
