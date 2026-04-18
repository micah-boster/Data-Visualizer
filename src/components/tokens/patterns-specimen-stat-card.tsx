'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { StatCard } from '@/components/patterns/stat-card';

/**
 * /tokens specimen — StatCard (DS-18, Phase 29 Plan 01).
 *
 * Exercises every StatCard state with fully-formatted props; no
 * provider-dependent data (matches 29-RESEARCH Pitfall 7 avoidance).
 *
 * Consumed by Plan 05's Component Patterns tab aggregator — this file only
 * exports StatCardSpecimen. It is NOT wired into token-browser.tsx here.
 */
export function StatCardSpecimen() {
  return (
    <TooltipProvider>
      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">StatCard (DS-18)</h2>
        <p className="text-body text-muted-foreground">
          Canonical stat display. Single size. Seven first-class states:
          value, loading, error, no-data, insufficient-data, stale, and
          comparison.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-stack">
          {/* 1. Default value + trend */}
          <StatCard
            label="Conversion Rate"
            value="42.3%"
            trend={{
              direction: 'up',
              deltaPercent: 2.1,
              metric: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
            }}
          />

          {/* 2. Loading */}
          <StatCard label="" value="" loading />

          {/* 3. Error */}
          <StatCard
            label="Open Rate"
            value=""
            error={{ message: 'Failed to load' }}
          />

          {/* 4. No-data */}
          <StatCard
            label="12mo Collection"
            value=""
            noData
            noDataReason="No batches at 12mo yet"
          />

          {/* 5. Insufficient data */}
          <StatCard
            label="SMS Open Rate"
            value="68.2%"
            insufficientData
            batchCount={2}
          />

          {/* 6. Stale */}
          <StatCard
            label="Accounts w/ Payment"
            value="1,234"
            stale
            trend={{
              direction: 'down',
              deltaPercent: -1.2,
              metric: 'TOTAL_ACCOUNTS_WITH_PAYMENT',
            }}
          />

          {/* 7. Comparison */}
          <StatCard
            label="Conversion Rate"
            value="42.3%"
            comparison={{ label: 'Portfolio avg', value: '38.1%' }}
            trend={{
              direction: 'up',
              deltaPercent: 4.2,
              metric: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
            }}
          />
        </div>
      </section>
    </TooltipProvider>
  );
}
