---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Intelligence & Cross-Partner Comparison
status: defining_requirements
last_updated: "2026-04-12"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** v3.0 — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-12 — Milestone v3.0 started

## Accumulated Context

### Decisions

- v3 focuses on three pillars: anomaly detection (passive), Claude query layer, cross-partner comparison
- Anomaly detection is the primary entry point — user opens tool, sees what's off first
- Claude query layer is the investigation tool — ask follow-up questions when something looks weird
- Cross-partner comparison is the analytical backbone — rankings + normalized trajectories
- Active notifications (Slack/email) deferred to v4 — prove passive value first
- Dashboard layout, summary reports, dynamic re-projection all deferred to v4
- usePartnerStats composition pattern established for computation layer (from v2)

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- Dimension filter at root level doesn't reduce table rows (bug from v2)

### Blockers/Concerns

- Snowflake credentials: needed for live data instead of static cache
- Claude API integration: Will need API key and rate limiting strategy for query layer
- Normalization model for cross-partner comparison: Need to define what "normalized" means for different account types/debt categories
