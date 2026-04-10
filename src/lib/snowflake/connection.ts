import snowflake from 'snowflake-sdk';

// Singleton pool -- survives across requests in the same serverless container
let pool: ReturnType<typeof snowflake.createPool> | null = null;

const REQUIRED_ENV_VARS = [
  'SNOWFLAKE_ACCOUNT',
  'SNOWFLAKE_USERNAME',
  'SNOWFLAKE_PASSWORD',
  'SNOWFLAKE_WAREHOUSE',
  'SNOWFLAKE_DATABASE',
  'SNOWFLAKE_SCHEMA',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required Snowflake environment variables: ${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill in your credentials.`
    );
  }
}

export function getPool(): ReturnType<typeof snowflake.createPool> {
  if (!pool) {
    validateEnv();

    // Configure snowflake-sdk to use Promise-based API and suppress noisy logs
    snowflake.configure({
      logLevel: 'WARN',
    });

    pool = snowflake.createPool(
      {
        account: process.env.SNOWFLAKE_ACCOUNT!,
        username: process.env.SNOWFLAKE_USERNAME!,
        password: process.env.SNOWFLAKE_PASSWORD!,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
        database: process.env.SNOWFLAKE_DATABASE!,
        schema: process.env.SNOWFLAKE_SCHEMA!,
        role: process.env.SNOWFLAKE_ROLE || undefined,
        application: 'BounceDataVisualizer',
        clientSessionKeepAlive: true,
      },
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
