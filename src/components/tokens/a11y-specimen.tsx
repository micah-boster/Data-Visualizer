'use client';

import { useState } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Save, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/section-header';

/**
 * /tokens "Accessibility" tab content. Aggregates six live demos, one per
 * a11y primitive shipped across Phase 33 Plans 02-04.
 *
 * 1. Focus Glow (Phase 31 DS-31 reuse) — the Tab-reveal soft spread-glow
 *    applied uniformly across every interactive surface in the app
 * 2. Icon-only Button with aria-label (Plan 33-02 sweep) — Tooltip + aria-label
 *    coexistence pattern; aria-label is the accessible-name contract, Tooltip
 *    stays for sighted users
 * 3. aria-pressed toggle (Plan 33-02) — state-reflecting toggle Button
 * 4. Base UI Dialog modal={true} (Plan 33-03) — focus trap + Escape close +
 *    restore-to-trigger contract; every Sheet consumer inherits this via
 *    ui/sheet.tsx wrapper default
 * 5. Skip-to-content link (Plan 33-02) — sr-only + focus:not-sr-only reveal
 *    wrapped in root layout; Tab from page-top reveals the bypass link
 * 6. Row-level keyboard (Plan 33-03) — drill-capable <tr> carries tabIndex=0,
 *    Enter drills, Escape pops a level; focus-glow-within lights up the row
 *
 * Structure mirrors VisualPolishSpecimen (Phase 31-06) and
 * ComponentPatternsSpecimen (Phase 29-05): single aggregator, inline
 * sub-sections, one SectionHeader per demo, shared gap-section rhythm.
 *
 * Allowlist note: this file lives in src/components/tokens/** which is
 * included in the TYPE_TOKEN_ALLOWLIST. Even so, the specimen prefers
 * semantic tokens (surface-raised, text-body, p-card-padding) over raw
 * Tailwind sizes for consistency with app code.
 */
export function A11ySpecimen() {
  return (
    <div className="flex flex-col gap-section">
      <FocusGlowDemo />
      <IconButtonAriaLabelDemo />
      <AriaPressedToggleDemo />
      <ModalDialogDemo />
      <SkipToContentDemo />
      <RowKeyboardDemo />
    </div>
  );
}

/* ---------------- 1. Focus Glow (A11Y-03 visible focus) ---------------- */

function FocusGlowDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Focus Glow — .focus-glow"
        eyebrow="33-03"
        description="Phase 31 focus-glow utility applied app-wide so every interactive element advertises keyboard focus. Tab into the cluster — mouse clicks do not fire the glow (:focus-visible-gated)."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex items-center gap-inline">
          <Button variant="default">Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. Icon-only Button + aria-label ---------------- */

function IconButtonAriaLabelDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Icon-only Button — aria-label + Tooltip coexistence"
        eyebrow="33-02"
        description="Tooltips alone do not satisfy axe-core button-name. The icon-only Button carries aria-label for the accessible name; Tooltip is additive for sighted users. Inner <svg> is aria-hidden via Button's [&_svg] selector."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex items-center gap-inline">
          <Button size="icon" aria-label="Save current view">
            <Save />
          </Button>
          <span className="text-caption text-muted-foreground">
            Inspect the button in DevTools: aria-label=&quot;Save current view&quot;.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 3. aria-pressed toggle ---------------- */

function AriaPressedToggleDemo() {
  const [pressed, setPressed] = useState(false);
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Toggle Button — aria-pressed"
        eyebrow="33-02"
        description="Toggle buttons expose aria-pressed reflecting on/off state. Screen readers announce the boolean; sighted users see aria-expanded-style visual state via the outline variant's aria-[haspopup] hooks."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex items-center gap-inline">
          <Button
            variant="outline"
            aria-pressed={pressed}
            onClick={() => setPressed((v) => !v)}
          >
            {pressed ? 'Pressed' : 'Not pressed'}
          </Button>
          <span className="text-caption text-muted-foreground">
            aria-pressed={pressed ? 'true' : 'false'}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 4. Modal Dialog — focus trap ---------------- */

function ModalDialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Modal Dialog — focus trap"
        eyebrow="33-03"
        description="Base UI Dialog with modal={true}. Opens via the trigger; focus traps inside; Escape closes; focus restores to the trigger. Every Sheet consumer inherits this contract via the ui/sheet.tsx wrapper default — no hand-rolled focus trap anywhere in the codebase."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={true}>
          <DialogPrimitive.Trigger
            render={<Button variant="outline">Open dialog</Button>}
          />
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-quick data-ending-style:opacity-0 data-starting-style:opacity-0" />
            <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface-floating p-card-padding shadow-elevation-floating transition duration-quick data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95">
              <DialogPrimitive.Title className="text-heading mb-stack">
                Trapped dialog
              </DialogPrimitive.Title>
              <p className="text-body text-muted-foreground mb-stack">
                Tab cycles within the popup. Escape closes. Focus returns to
                the opening trigger.
              </p>
              <div className="flex items-center gap-inline">
                <DialogPrimitive.Close
                  render={<Button variant="default">Close</Button>}
                />
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Also close
                </Button>
              </div>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </section>
  );
}

/* ---------------- 5. Skip-to-content link ---------------- */

function SkipToContentDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Skip-to-content link — sr-only + focus:not-sr-only"
        eyebrow="33-02"
        description="Lives in src/app/layout.tsx as the first focusable child of <body>. sr-only by default; Tab-focus reveals it so keyboard users can bypass the toolbar / sidebar and jump to #main. Demo below mirrors the real recipe."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex flex-col gap-stack">
          <p className="text-body text-muted-foreground">
            Tab into the (invisible) link below, then continue tabbing to see
            it disappear again.
          </p>
          <a
            href="#__a11y_demo_anchor"
            className="sr-only focus:not-sr-only focus:inline-block focus-glow self-start rounded-md bg-surface-raised px-inline py-inline text-body text-foreground shadow-xs"
          >
            Skip to content (Tab here to reveal)
          </a>
          <span
            id="__a11y_demo_anchor"
            className="text-caption text-muted-foreground"
          >
            (This span is the demo anchor target.)
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. Row-level keyboard ---------------- */

function RowKeyboardDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Row keyboard — Tab / Enter / Escape"
        eyebrow="33-03"
        description="Drill-capable rows in the data table are Tab stops (tabIndex=0), Enter drills into the row, Escape pops back one level. The scroll wrapper itself also carries tabIndex=0 so axe's scrollable-region-focusable rule passes even when the virtualizer has not mounted any rows yet. focus-glow-within lights up the whole row when a child element receives focus."
      />

      <div
        className="bg-surface-raised rounded-lg shadow-elevation-raised overflow-hidden"
        role="table"
        aria-label="Keyboard-focusable rows demo"
      >
        <div
          role="row"
          tabIndex={0}
          className="focus-glow-within flex items-center gap-inline px-card-padding py-stack border-b border-border last:border-b-0 transition-colors duration-quick ease-default hover:bg-hover-bg"
        >
          <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-body text-foreground">
            Focusable row — Tab to focus, Enter to activate
          </span>
        </div>
        <div
          role="row"
          tabIndex={0}
          className="focus-glow-within flex items-center gap-inline px-card-padding py-stack border-b border-border last:border-b-0 transition-colors duration-quick ease-default hover:bg-hover-bg"
        >
          <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-body text-foreground">
            Another focusable row — same recipe
          </span>
        </div>
      </div>
    </section>
  );
}
