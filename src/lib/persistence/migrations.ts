/**
 * Persistence migration runner — Phase 43 BND-03.
 *
 * Runs a chain of pure transforms `fromVersion → fromVersion + 1`, sequentially,
 * until the payload is at the consumer's `currentVersion`. The CONTEXT lock for
 * BND-03 is:
 *
 *   - Schema version mismatch WITH a migrator chain → migrate silently
 *     (invisible upgrade — no toast, no notification).
 *   - MISSING migrator → fail loud, drop the blob, log to error tracking in
 *     prod. Throws `MissingMigratorError` here; the caller (versioned-storage)
 *     decides whether to re-throw (dev) or swallow + drop the blob (prod).
 *
 * The runner does NOT validate the final shape — that's the caller's job via
 * its Zod schema. Migrators are pure transforms; they may throw on truly
 * invalid input but must not perform IO.
 */

/**
 * Thrown when `runMigrations` discovers a stored `schemaVersion` with no
 * forward path in the supplied chain. The caller (versioned-storage) catches
 * this, logs it, drops the blob, and returns the consumer's defaultValue.
 *
 * Carries `fromVersion` and `toVersion` on the message so the dev-console
 * surface is self-explanatory.
 */
export class MissingMigratorError extends Error {
  readonly fromVersion: number;
  readonly toVersion: number;

  constructor(fromVersion: number, toVersion: number) {
    super(
      `MissingMigratorError: no migrator from schemaVersion ${fromVersion} → ${fromVersion + 1} (target ${toVersion})`,
    );
    this.name = 'MissingMigratorError';
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
}

/**
 * A single migrator: takes the previous-version payload (untyped — could be
 * anything that landed in localStorage) and returns the next-version payload.
 * Pure transform: no IO, no Date.now(), no random IDs (deterministic so
 * round-trip tests can assert against fixed inputs).
 */
export type Migration = (input: unknown) => unknown;

/**
 * Migration chain keyed by `fromVersion`. The migrator at `chain[N]` produces
 * shape `N + 1`. The chain therefore covers the half-open interval
 * `[fromVersion, currentVersion)`.
 *
 * Initial seed (the current shape that this plan introduces) is
 * `schemaVersion: 1` with an EMPTY chain — there's nothing to migrate yet.
 * Future schema changes append entries: `chain[1] = migrator that produces v2`,
 * `chain[2] = migrator that produces v3`, etc.
 */
export type MigrationChain = Record<number, Migration>;

/**
 * Run the chain from `fromVersion` → `currentVersion`. Returns the migrated
 * payload (still untyped — caller validates against its Zod schema). Throws
 * `MissingMigratorError` if any step in the chain is missing.
 *
 * NO-OP CASE: if `fromVersion >= currentVersion`, the input is returned
 * unchanged. (The future-schema branch is handled by the caller, not here.)
 */
export function runMigrations(
  payload: unknown,
  fromVersion: number,
  currentVersion: number,
  chain: MigrationChain,
): unknown {
  let current = payload;
  for (let v = fromVersion; v < currentVersion; v++) {
    const migrator = chain[v];
    if (!migrator) {
      throw new MissingMigratorError(v, currentVersion);
    }
    current = migrator(current);
  }
  return current;
}
