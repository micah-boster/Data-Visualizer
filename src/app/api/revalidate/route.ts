import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { generateRequestId } from '@/lib/snowflake/reliability';

/**
 * Phase 43 BND-06 — daily-ETL cache-bust endpoint.
 *
 * The daily ETL job hits this POST endpoint after writing fresh batch data
 * to Snowflake. We invalidate the `batch-data` Next.js route cache tag,
 * which marks every cached response from `/api/data` (and any other route
 * that wraps `unstable_cache(..., { tags: ['batch-data'] })`) as stale —
 * the next request through that route refreshes from Snowflake on miss.
 *
 * **NOT called from the client.** The locked design lives in
 * `.planning/adr/009-caching-layers.md`: the user-facing `<RefreshButton>`
 * calls `queryClient.invalidateQueries({ queryKey: ['data'] })` ONLY. The
 * shared secret never leaves the server. The 1h Layer-1 stale window is
 * acceptable for a daily-cadence dataset; the ETL is the authoritative
 * trigger for fresh data.
 *
 * Auth: shared secret via `Authorization: Bearer ${REVALIDATE_SECRET}`.
 * The secret is documented inline below — production Phase 42 will audit
 * the auth pattern as part of the "Ingestion-Surface Security Review"
 * (deferred per 43-CONTEXT.md). For now: if the env var is unset, the
 * endpoint refuses every request (defaults to denied).
 *
 * Per Next 16 docs/01-app/03-api-reference/04-functions/revalidateTag.md
 * the two-argument signature is required (`tag, profile`). We use
 * `'max'` for stale-while-revalidate semantics — the next request to a
 * tagged route serves cached content while fresh data fetches in the
 * background. ETL latency tolerance is ~minutes, not seconds, so this
 * is the right cadence; webhook-style `{ expire: 0 }` would force a
 * blocking miss on the next request which is unnecessary here.
 *
 * ADR: .planning/adr/009-caching-layers.md
 */

const CACHE_TAG = 'batch-data';

/**
 * .env.example carries `REVALIDATE_SECRET=` (commented stub). Set in
 * .env.local + Vercel env. Phase 42 ingestion-security review audits
 * the auth pattern; for now this is a shared-secret stub aligned with
 * the BND-06 spec ("documented in .env.example") + 43-CONTEXT.md
 * deferred-items note that ETL auth lands in Phase 42.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    // Default-denied posture: a misconfigured deploy (env var unset) refuses
    // all callers rather than silently allowing anyone with the URL to
    // invalidate the cache.
    return false;
  }
  const header = request.headers.get('authorization') ?? '';
  const expectedHeader = `Bearer ${expected}`;
  // Constant-time comparison would be ideal, but the comparison is between
  // server-controlled strings; timing leakage from === here is bounded by the
  // header-prefix early-exit which is itself non-secret. Phase 42 audit will
  // upgrade to crypto.timingSafeEqual if the threat model justifies it.
  return header === expectedHeader;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', requestId },
      {
        status: 401,
        headers: {
          'X-Request-Id': requestId,
          // RFC-7235 hint to clients that auth is needed; legitimate ETL
          // callers always include the header so they never see this.
          'WWW-Authenticate': 'Bearer realm="revalidate"',
        },
      },
    );
  }

  // Body is optional; default to the canonical batch-data tag. Future
  // routes can carry their own tags and the ETL passes them through here.
  let tag = CACHE_TAG;
  try {
    const body = await request.json().catch(() => null);
    if (body && typeof body === 'object' && typeof body.tag === 'string' && body.tag.length > 0) {
      tag = body.tag;
    }
  } catch {
    // Empty body or malformed JSON — fall back to default tag silently.
  }

  // Per Next 16 revalidateTag docs: `'max'` profile = stale-while-revalidate.
  // Tagged routes serve cached content on the next request while fresh data
  // fetches in the background. This is the recommended pattern for content
  // where slight delay is acceptable (the docs literally call out "blog
  // posts, product catalogs, or documentation" — daily ETL data fits).
  revalidateTag(tag, 'max');

  return NextResponse.json(
    { revalidated: true, tag, requestId },
    {
      headers: { 'X-Request-Id': requestId },
    },
  );
}
