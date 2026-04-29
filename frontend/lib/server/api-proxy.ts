import type { NextRequest } from 'next/server';

function normalizeBaseURL(value: string) {
  return value.replace(/\/+$/, '');
}

const isDevelopmentRuntime = process.env.NODE_ENV !== 'production';
const localGatewayBaseURL = 'http://localhost:80';
const defaultProductionBackendBaseURL = 'https://api.xenodia.xyz';

export function resolveBackendBaseURL() {
  return normalizeBaseURL(
    process.env.BACKEND_BASE_URL ||
      (isDevelopmentRuntime ? localGatewayBaseURL : defaultProductionBackendBaseURL),
  );
}

export function resolveAuthBaseURL() {
  const backendBaseURL = resolveBackendBaseURL();
  return normalizeBaseURL(
    process.env.AUTH_BASE_URL ||
      (process.env.BACKEND_BASE_URL
        ? backendBaseURL
        : isDevelopmentRuntime
          ? 'http://localhost:8001'
          : backendBaseURL),
  );
}

export function resolveGatewayBaseURL() {
  const backendBaseURL = resolveBackendBaseURL();
  return normalizeBaseURL(
    process.env.GATEWAY_BASE_URL ||
      (process.env.BACKEND_BASE_URL
        ? backendBaseURL
        : isDevelopmentRuntime
          ? 'http://localhost:8002'
          : backendBaseURL),
  );
}

export function resolveBillingBaseURL() {
  const backendBaseURL = resolveBackendBaseURL();
  return normalizeBaseURL(
    process.env.BILLING_BASE_URL ||
      (process.env.BACKEND_BASE_URL
        ? backendBaseURL
        : isDevelopmentRuntime
          ? 'http://localhost:8003'
          : backendBaseURL),
  );
}

export function resolveHealthBaseURL() {
  return normalizeBaseURL(
    process.env.HEALTH_BASE_URL ||
      (process.env.VERCEL === '1' || process.env.VERCEL === 'true'
        ? 'http://43.153.57.123'
        : resolveBackendBaseURL()),
  );
}

function shouldRetryProxyRequest(method: string) {
  return ['GET', 'HEAD', 'OPTIONS', 'PUT'].includes(method.toUpperCase());
}

async function waitForRetry() {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

export async function proxyRequest(request: NextRequest, upstreamBaseURL: string, upstreamLabel = 'backend') {
  const upstreamURL = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, upstreamBaseURL);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('accept-encoding');
  const method = request.method.toUpperCase();
  const body = method !== 'GET' && method !== 'HEAD' ? await request.arrayBuffer() : null;

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };

  if (body && body.byteLength > 0) {
    init.body = body;
  }

  let lastError: unknown;
  const attempts = shouldRetryProxyRequest(method) ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(upstreamURL, init);
      const responseHeaders = new Headers(response.headers);

      // Undici/Next may hand us a decoded body while preserving upstream
      // compression headers. Strip transport-level headers before relaying.
      responseHeaders.delete('content-length');
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('transfer-encoding');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await waitForRetry();
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Upstream request failed';
  return Response.json(
    {
      error: 'bad_gateway',
      message: `Failed to reach upstream ${upstreamLabel} service: ${message}`,
    },
    { status: 502 },
  );
}
