import { getPool } from './connection';

/**
 * Execute a Snowflake query and return typed results.
 * Wraps the callback-based snowflake-sdk in a Promise with a 45-second timeout
 * to leave headroom under Vercel's 60s function limit.
 */
export async function executeQuery<T = Record<string, unknown>>(
  sqlText: string,
  binds?: (string | number)[]
): Promise<T[]> {
  const pool = getPool();

  return new Promise<T[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Snowflake query timed out after 45 seconds'));
    }, 45000);

    pool.use(async (connection) => {
      return new Promise<T[]>((innerResolve, innerReject) => {
        connection.execute({
          sqlText,
          binds,
          complete: (err, _stmt, rows) => {
            clearTimeout(timeout);
            if (err) {
              innerReject(err);
            } else {
              innerResolve((rows ?? []) as T[]);
            }
          },
        });
      });
    })
      .then(resolve)
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}
