function normalizeBaseURL(value: string) {
  return value.replace(/\/+$/, '');
}

const isDevelopmentRuntime = process.env.NODE_ENV !== 'production';

export function resolveZeroGAuthBaseURL() {
  return normalizeBaseURL(
    process.env.ZERO_G_AUTH_BASE_URL ||
      process.env.AUTH_BASE_URL ||
      (isDevelopmentRuntime ? 'http://localhost:8001' : 'https://api.xenodia.xyz'),
  );
}

export function resolveZeroGCapabilityGatewayBaseURL() {
  return normalizeBaseURL(
    process.env.ZERO_G_CAPABILITY_GATEWAY_BASE_URL ||
      process.env.GATEWAY_BASE_URL ||
      (isDevelopmentRuntime ? 'http://localhost:8002' : 'https://api.xenodia.xyz'),
  );
}
