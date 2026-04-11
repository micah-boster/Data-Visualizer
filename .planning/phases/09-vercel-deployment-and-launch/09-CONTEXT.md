# Phase 9: Vercel Deployment and Launch - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the completed app to Vercel so the partnerships team can access it via URL with live Snowflake data. No new features — this is purely deployment, configuration, and handoff.

</domain>

<decisions>
## Implementation Decisions

### URL and access
- Vercel subdomain: `bounce-data-viz.vercel.app` (preferred name)
- Open access — no password protection or auth for now (security improvements deferred)
- Primary audience is partnerships team, with potential expansion to other Bounce teams later

### Deploy workflow
- Auto-deploy on push to main branch (standard Vercel + GitHub integration)
- Connect existing GitHub repo — no new repo needed
- Enable preview deployments for pull requests
- Vercel account TBD — decide during deployment (personal vs team account)

### Environment and secrets
- Only Snowflake credentials needed (no analytics, feature flags, or other API keys)
- Same Snowflake warehouse/database as local development — one source of truth
- Credentials need to be set up fresh in Vercel environment variables (not yet in .env.local)
- Include a `/api/health` endpoint that confirms Snowflake connectivity — helps debug deploy issues

### Launch rollout
- Quick walkthrough (live demo or Loom video) when sharing with the team
- Smoke test checklist before sharing — verify key features work on deployed URL
- No formal feedback mechanism for now — handle informally
- No hard deadline — ship when ready

### Claude's Discretion
- Exact Vercel project configuration settings
- vercel.json contents and build settings
- Smoke test checklist items (based on what features exist at deploy time)
- Health check endpoint implementation details

</decisions>

<specifics>
## Specific Ideas

- Start with partnerships team, expand to other teams based on interest
- Health check endpoint should confirm Snowflake is reachable, not just that the app loads
- Walkthrough should cover the key workflows the team will use daily

</specifics>

<deferred>
## Deferred Ideas

- Password protection or SSO auth — add in a future iteration when access control matters
- Formal feedback mechanism (in-app link or dedicated channel) — add if needed after launch
- Custom domain (e.g., data.bounce.com) — upgrade from Vercel subdomain later if desired

</deferred>

---

*Phase: 09-vercel-deployment-and-launch*
*Context gathered: 2026-04-11*
