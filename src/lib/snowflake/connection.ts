import snowflake from 'snowflake-sdk';

/**
 * Multi-mode Snowflake connection layer.
 *
 * `SNOWFLAKE_AUTH` selects which credential set to use:
 *   - `password`         — username + password (default; works locally)
 *   - `externalbrowser`  — opens browser for SSO/Okta (local dev only —
 *                          serverless containers can't pop a browser)
 *   - `keypair`          — RSA key pair (works on Vercel; no password)
 *
 * If `SNOWFLAKE_AUTH` is unset, falls back to `password` for backward
 * compatibility with the original single-mode setup.
 *
 * Per-mode env-var requirements are validated only when the mode is
 * selected. A partial credential set in another mode (e.g. account +
 * username + AUTH=externalbrowser, no password) is no longer a 500 — it
 * dispatches to externalbrowser like the user asked.
 *
 * Static-mode fallback (when nobody intends to connect at all) lives
 * in `src/lib/static-cache/fallback.ts` and is checked by API routes
 * BEFORE this module is touched.
 */

// Singleton pool — survives across requests in the same serverless container
let pool: ReturnType<typeof snowflake.createPool> | null = null;

type AuthMode = 'password' | 'externalbrowser' | 'keypair';

// Common env vars required for every auth mode.
const COMMON_REQUIRED = [
  'SNOWFLAKE_ACCOUNT',
  'SNOWFLAKE_USERNAME',
  'SNOWFLAKE_WAREHOUSE',
  'SNOWFLAKE_DATABASE',
  'SNOWFLAKE_SCHEMA',
] as const;

// Per-mode additional required vars.
const MODE_REQUIRED: Record<AuthMode, readonly string[]> = {
  password: ['SNOWFLAKE_PASSWORD'],
  externalbrowser: [], // no extra creds — browser handles SSO
  keypair: ['SNOWFLAKE_PRIVATE_KEY'],
};

function getAuthMode(): AuthMode {
  const raw = (process.env.SNOWFLAKE_AUTH ?? 'password').trim().toLowerCase();
  if (raw === 'password' || raw === 'externalbrowser' || raw === 'keypair') {
    return raw;
  }
  throw new Error(
    `Invalid SNOWFLAKE_AUTH value: ${JSON.stringify(raw)}. ` +
    `Expected one of: password, externalbrowser, keypair.`
  );
}

function validateEnv(mode: AuthMode): void {
  const required = [...COMMON_REQUIRED, ...MODE_REQUIRED[mode]];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required Snowflake environment variables for auth mode "${mode}": ` +
      `${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill in your credentials, or set ` +
      `SNOWFLAKE_AUTH to a different mode.`
    );
  }
}

/**
 * Decode the PEM-formatted private key for keypair auth.
 *
 * Vercel doesn't preserve newlines in env vars, so the PEM is typically
 * stored either with literal `\n` escape sequences (which we expand) or
 * base64-encoded (which we decode).
 */
function decodePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  // Already a real PEM with newlines.
  if (trimmed.includes('\n') && trimmed.startsWith('-----BEGIN')) {
    return trimmed;
  }
  // PEM with literal `\n` escapes (Vercel-flattened).
  if (trimmed.startsWith('-----BEGIN') && trimmed.includes('\\n')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  // Base64-wrapped PEM.
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.startsWith('-----BEGIN')) return decoded;
  } catch {
    /* fall through */
  }
  throw new Error(
    'SNOWFLAKE_PRIVATE_KEY is set but neither a valid PEM (with real or ' +
    'escaped newlines) nor a base64-encoded PEM. Re-encode and try again.'
  );
}

/**
 * Build the connection options object for `snowflake.createPool`.
 * Exported for test/inspection — not used outside this module in app code.
 */
export function buildConnectionOptions(mode: AuthMode = getAuthMode()) {
  validateEnv(mode);

  const base = {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USERNAME!,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
    database: process.env.SNOWFLAKE_DATABASE!,
    schema: process.env.SNOWFLAKE_SCHEMA!,
    role: process.env.SNOWFLAKE_ROLE || undefined,
    application: 'BounceDataVisualizer',
    clientSessionKeepAlive: true,
  };

  if (mode === 'password') {
    return {
      ...base,
      authenticator: 'SNOWFLAKE',
      password: process.env.SNOWFLAKE_PASSWORD!,
    };
  }

  if (mode === 'externalbrowser') {
    return {
      ...base,
      authenticator: 'EXTERNALBROWSER',
      // Cache the SSO token so users aren't prompted on every page load.
      // The cache lives on the local filesystem in serverless containers
      // it's per-instance scratch which is fine for Vercel previews.
      clientStoreTemporaryCredential: true,
    };
  }

  // keypair
  return {
    ...base,
    authenticator: 'SNOWFLAKE_JWT',
    privateKey: decodePrivateKey(process.env.SNOWFLAKE_PRIVATE_KEY!),
    privateKeyPass: process.env.SNOWFLAKE_PRIVATE_KEY_PASS || undefined,
  };
}

export function getPool(): ReturnType<typeof snowflake.createPool> {
  if (!pool) {
    const mode = getAuthMode();
    const options = buildConnectionOptions(mode);

    // Configure snowflake-sdk to use Promise-based API and suppress noisy logs.
    snowflake.configure({ logLevel: 'WARN' });

    pool = snowflake.createPool(
      options as Parameters<typeof snowflake.createPool>[0],
      {
        max: 5,
        min: 0,
        evictionRunIntervalMillis: 60000,
        idleTimeoutMillis: 120000,
      }
    );
  }
  return pool;
}
