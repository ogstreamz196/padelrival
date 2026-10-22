import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const CANONICAL_HOST = "padelrival.co.uk";
const OLD_HOSTS = new Set(["padel.ogbot.co.uk", "www.padelrival.co.uk"]);

/**
 * Permanently redirect the old domain and www to padelrival.co.uk so links and search
 * rankings consolidate. Native app builds made before the move still load the old
 * domain inside a web view and only allow navigation there, so those requests
 * (Android "; wv)" or an iOS WebKit UA without "Safari/") are left alone.
 */
function canonicalRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (!OLD_HOSTS.has(url.hostname)) return null;
  const ua = request.headers.get("user-agent") ?? "";
  const nativeWebView = /; wv\)/.test(ua) || (/AppleWebKit/.test(ua) && /Mobile\//.test(ua) && !/Safari\//.test(ua));
  if (nativeWebView) return null;
  url.hostname = CANONICAL_HOST;
  url.protocol = "https:";
  url.port = "";
  return Response.redirect(url.toString(), 301);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
