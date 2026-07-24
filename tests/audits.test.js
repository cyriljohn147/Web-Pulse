import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
const app = buildApp();
afterEach(() => {
    vi.unstubAllGlobals();
});
afterAll(async () => {
    await app.close();
});
describe("Page Pulse API", () => {
    it("returns a healthy service response", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/health",
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            service: "page-pulse",
        });
    });
    it("rejects an invalid URL", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/v1/audits",
            payload: {
                url: "not-a-url",
            },
        });
        const body = response.json();
        expect(response.statusCode).toBe(400);
        expect(body.error.code).toBe("VALIDATION_ERROR");
    });
    it("rejects a URL with a non-HTTP protocol", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/v1/audits",
            payload: {
                url: "ftp://example.com",
            },
        });
        const body = response.json();
        expect(response.statusCode).toBe(400);
        expect(body.error.code).toBe("VALIDATION_ERROR");
    });
    it("audits an HTML page and caches the next matching request", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(`
          <html>
            <head>
              <title>Test page</title>
              <meta name="description" content="A test description" />
            </head>
            <body>
              <h1>Heading one</h1>
              <h1>Heading two</h1>
            </body>
          </html>
        `, {
            status: 200,
            headers: {
                "content-type": "text/html",
            },
        }));
        vi.stubGlobal("fetch", fetchMock);
        const firstResponse = await app.inject({
            method: "POST",
            url: "/v1/audits",
            payload: {
                url: "https://cache-test.example",
            },
        });
        const secondResponse = await app.inject({
            method: "POST",
            url: "/v1/audits",
            payload: {
                url: "https://cache-test.example",
            },
        });
        expect(firstResponse.statusCode).toBe(200);
        expect(firstResponse.json().cached).toBe(false);
        expect(secondResponse.statusCode).toBe(200);
        expect(secondResponse.json().cached).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=audits.test.js.map