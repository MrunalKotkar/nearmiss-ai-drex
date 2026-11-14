# NearMissAI — Current Frontend Design

## Purpose

NearMissAI is presented as an aviation safety investigation workspace for exploring de-identified NASA ASRS reports, comparing related incidents, and reviewing collaborative agent analysis. The current experience is optimized for analyst triage rather than public-facing storytelling.

## Current information architecture

```text
Application shell
├── Top bar
│   ├── NearMissAI brand mark
│   ├── Operations Desk / ASRS Archive context
│   └── Data service status
├── Case directory (left rail)
│   ├── Search report text
│   ├── Category filters
│   ├── Archive count
│   ├── Scrollable incident list
│   └── Data provenance disclaimer
├── Investigation workspace (main area)
│   ├── Hero / signal overview
│   ├── Active report heading
│   └── Tabs
│       ├── Case brief
│       ├── Agent analysis
│       └── Corpus signals
└── Footer
    ├── Analyst triage label
    ├── Data source label
    └── Human review required
```

## Main user flow

1. User searches or filters the June 2024 ASRS archive.
2. User selects an incident from the case directory.
3. The case brief loads the reporter narrative, report telemetry, and historical matches.
4. User starts collaborative analysis when the analysis service is online.
5. The analysis tab shows the recommendation, agent decisions, decision scores, uncertainty, and evidence passages.
6. The corpus tab provides source-coded primary-problem counts for the current export.

## Visual direction

- **Mood:** calm, technical, trustworthy, operational.
- **Theme:** dark navy control-room interface with aviation-safety cues.
- **Primary accent:** sky/cyan blue for active controls, links, selected states, and evidence.
- **Status colors:** green for online/ready, amber for pending or cached, red for service errors.
- **Typography:** Inter/system sans for reading; monospace for ACNs, run IDs, timestamps, labels, and archive metadata.
- **Surfaces:** layered navy cards with thin blue-gray borders, restrained gradients, and low-intensity shadows.
- **Motif:** radar grid/rings and a sweep animation in the hero area to reinforce detection and signal discovery.
- **Shape language:** medium-radius cards and compact controls; active case rows use a cyan inset rail.

## Current component inventory

- Header/status bar
- Brand lockup with rotated plane icon
- Search input and category filter buttons
- Scrollable case list with selected state
- Hero panel with radar visualization
- Status badges and online/offline dots
- Tabbed workspace
- Narrative card with expandable supplemental narrative
- Related-report disclosure cards with match scores
- Case telemetry key/value rows
- Collaborative-analysis call-to-action card
- Loading skeletons and service-error alerts
- Agent trace timeline with role icons and score bars
- Recommendation panel
- Corpus signal bars
- Provenance and human-review disclaimers

## Design strengths

- The purpose is immediately legible: investigation, aviation safety, and live analysis are visible above the fold.
- The case directory and workspace map well to an analyst’s browse → inspect → investigate workflow.
- Provenance and safety caveats are kept in the UI rather than hidden in documentation.
- The interface distinguishes source narrative, historical context, agent reasoning, and corpus-level signals.
- Offline states are explicit; users can still browse cases when the live analysis service is unavailable.
- The visual language is cohesive and domain-specific without using decorative aviation imagery.

## Review points for the next agent

### 1. Reduce cognitive load in the first viewport

The current screen contains a large hero, a persistent case rail, multiple labels, and several status indicators. Review whether the hero can become a smaller “workspace header” so the selected case and its primary action appear sooner.

### 2. Make the selected case more actionable

The current selected state is visually clear, but the main case brief could expose a stronger summary block: incident type, severity/review priority if known, confidence/uncertainty, and the next recommended analyst action.

### 3. Improve analysis progress visibility

The analysis state currently shows a generic waiting message. Consider a staged progress treatment that names the active phase: pattern scan, evidence review, investigation planning, and coordinator synthesis.

### 4. Clarify score semantics

Decision scores are displayed as percentages. Keep the existing disclaimer, but also label them inline as “decision support score” or “model preference” so they are not mistaken for accident probabilities or calibrated risk.

### 5. Strengthen responsive behavior

On small screens the case directory moves above the workspace. Review whether it should become a compact drawer/selector so the case brief gets more vertical priority.

### 6. Treat evidence as a first-class interaction

Source passages currently appear below the trace. Consider linking each claim or decision directly to its evidence, with a side panel or anchored detail view for source, location, status, and passage text.

## Recommended next-iteration direction

Keep the current dark operations-desk identity, but shift the composition toward a **case-first investigation console**:

```text
Compact header/status
└── Selected case summary + primary action
    ├── Narrative and report facts
    ├── Related incidents / signal clusters
    └── Analysis workspace
        ├── Progress and agent roles
        ├── Recommendation + uncertainty
        └── Evidence-linked reasoning
```

The next iteration should preserve the existing colors, typography, provenance language, and clear offline behavior. The main change should be hierarchy: the selected incident and its review decision become the visual center, while archive browsing and corpus context become supporting tools.

## Source implementation

- Main screen: `dashboard/web/src/app/page.tsx`
- Visual tokens and layout: `dashboard/web/src/app/globals.css`
- Product summary: `dashboard/web/README.md`

## Suggested handoff prompt

> Review `CURRENT_FRONTEND_DESIGN.md` against the implementation in `dashboard/web/src/app/page.tsx` and `dashboard/web/src/app/globals.css`. Recommend the smallest high-impact frontend changes that make the selected case, analysis progress, evidence linkage, and next analyst action clearer without losing the existing aviation operations-desk visual identity. Separate recommendations into information architecture, interaction, visual design, accessibility, and implementation risk.
