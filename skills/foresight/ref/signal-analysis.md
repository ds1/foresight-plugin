# Signal Analysis — Automated Pattern Detection Reference

This file instructs the skill to perform automated pattern analysis on the signal database. Analysis runs after every database write (new signals added, strengths updated, connections added) and stores results in `signals/insights.json`.

---

## When to Run Analysis

**Trigger**: After any modification to `signals/database.json` or `signals/graph.json`.

**Process**:
1. Read `signals/database.json` and `signals/graph.json`
2. Run all seven detection passes (below)
3. Write results to `signals/insights.json`
4. Surface actionable insights to the user (see Surfacing Rules below)

If the database has fewer than 5 signals, skip analysis — not enough data for meaningful patterns.

---

## Implementation Note — code vs. LLM (autonomous pipeline)

The `pipeline/` in this repository runs part of this analysis deterministically so that scheduled, unattended runs are idempotent:

- **Pass 1 (Cluster Detection) and Pass 7 (STEEP+V Gaps) are implemented in code** — `pipeline/lib/cluster.js`, invoked by `node pipeline/run.js analyze`. Code emits the schemas below with two deliberate deviations:
  - **Stable IDs.** A cluster's `id` is `cluster-<first 8 hex of SHA-1 over its sorted member signal IDs>` rather than the date-sequence form. Reason: the same cluster must keep the same ID across daily re-runs so `status`, `note`, `proposed_driver` and the publication ledger survive. `date_detected` is still recorded. If a cluster's membership changes, it gets a new ID and the old entry is kept with `"status": "superseded"` and `"superseded_by": "<new-id>"`.
  - **`proposed_driver` / `proposed_direction` start empty** (`null` / `""`). Naming a driver is a semantic judgement; the LLM fills these in during the run (or a human does during curation). Code never overwrites a non-empty value.
- **Passes 2 (Convergence) and 4 (Contradiction) are produced by the LLM** after a scan, written into `insights.json` in the exact schemas below; `run.js analyze` validates the shape and preserves IDs and `status` across runs.
- **Passes 3, 5 and 6 (Acceleration, Emergence, Decay) are deferred** until the database carries enough `history` to make them meaningful; code leaves those arrays untouched.
- **"Already published" is tracked outside this file**, in `pipeline/ledger.json` (insight ID or topic slug → article slug, date, status). `insights.json` keeps its `status` vocabulary unchanged. When the pipeline publishes a cluster article it also sets that cluster's `status` to `confirmed`.

---

## Seven Detection Passes

### 1. Cluster Detection

**What**: Groups of 3+ signals that share tags, domains, or directional language but are not yet linked to a common driver.

**How**:
- Group signals by overlapping tags (2+ shared tags = potential cluster)
- Group signals by shared domain
- Within each group, check if they share a directional pattern (similar "direction" field language)
- Exclude groups already fully covered by an existing driver in `graph.json`
- For each uncovered cluster: propose a driver name, direction, and the signal IDs that belong to it

**Output schema**:
```json
{
  "type": "cluster",
  "id": "cluster-YYYY-MM-DD-NNN",
  "proposed_driver": "Suggested driver name",
  "proposed_direction": "From X → To Y",
  "signals": ["sig-XXX", "sig-YYY", "sig-ZZZ"],
  "shared_tags": ["tag1", "tag2"],
  "shared_domains": ["domain"],
  "confidence": "strong | moderate | tentative",
  "date_detected": "YYYY-MM-DD",
  "status": "new | confirmed | dismissed",
  "note": "Why this cluster matters"
}
```

**Confidence levels**:
- **Strong**: 5+ signals, high tag overlap, consistent direction, multiple source types
- **Moderate**: 3-4 signals, some tag overlap, generally consistent direction
- **Tentative**: 3 signals, loose tag overlap, direction not fully consistent

---

### 2. Cross-Domain Convergence

**What**: Signals from different domains that point in the same direction. This is the highest-value pattern — it suggests a deep structural force that transcends any single sector.

**How**:
- Compare signals across different domains
- Look for shared directional patterns (similar "From X → To Y" language)
- Look for signals in different domains that reference the same underlying phenomenon
- Check whether any existing driver already bridges these domains — if not, this is a novel convergence

**Output schema**:
```json
{
  "type": "convergence",
  "id": "conv-YYYY-MM-DD-NNN",
  "domains": ["domain-a", "domain-b"],
  "direction": "Shared directional pattern",
  "signals": ["sig-XXX (domain-a)", "sig-YYY (domain-b)"],
  "bridging_driver": "Existing driver if any, or null",
  "proposed_driver": "Suggested bridging driver if new",
  "significance": "Why this cross-domain pattern matters",
  "date_detected": "YYYY-MM-DD",
  "status": "new | confirmed | dismissed"
}
```

**Significance heuristic**: The more distant the domains (e.g., healthcare + defense, or education + finance), the more significant the convergence. Same-sector convergence is useful but expected.

---

### 3. Acceleration Detection

**What**: Drivers or domain clusters where signal strength has been upgrading — indicating the pace of change is increasing.

**How**:
- Scan signal history arrays for recent strength upgrades (within last 6 months)
- Group by driver: if 2+ signals in the same driver have upgraded, the driver is accelerating
- Group by domain: if 3+ signals in a domain have upgraded, the whole domain is heating up
- Flag any signal that jumped 2+ strength levels (e.g., early → accelerating) — this is a rapid acceleration

**Output schema**:
```json
{
  "type": "acceleration",
  "id": "accel-YYYY-MM-DD-NNN",
  "scope": "driver | domain",
  "name": "Driver or domain name",
  "signals_upgraded": ["sig-XXX", "sig-YYY"],
  "upgrade_details": [
    {"signal": "sig-XXX", "from": "early", "to": "emerging", "date": "YYYY-MM-DD"},
    {"signal": "sig-YYY", "from": "emerging", "to": "accelerating", "date": "YYYY-MM-DD"}
  ],
  "implication": "What this acceleration suggests",
  "date_detected": "YYYY-MM-DD"
}
```

---

### 4. Contradiction Surfacing

**What**: Signals within the same domain or driver that push in opposite directions. Contradictions are not errors — they indicate genuine uncertainty and are prime material for scenario axes.

**How**:
- Within each domain and driver, compare signal directions
- Flag pairs where directions are explicitly opposed (e.g., "centralization" vs. "decentralization", "growth" vs. "decline")
- Also flag pairs where one signal's shadow implications directly conflict with another signal's positive implications
- Check for signals tagged "contradicts" in the connections graph

**Output schema**:
```json
{
  "type": "contradiction",
  "id": "contra-YYYY-MM-DD-NNN",
  "domain_or_driver": "Where the tension lives",
  "signal_a": {"id": "sig-XXX", "direction": "Toward X"},
  "signal_b": {"id": "sig-YYY", "direction": "Toward Y"},
  "tension": "Plain-language description of the contradiction",
  "scenario_potential": "How this tension could become a scenario axis",
  "date_detected": "YYYY-MM-DD",
  "status": "new | used-in-scenario | resolved | dismissed"
}
```

**Key insight**: Every strong contradiction is a candidate 2x2 scenario axis. When surfacing contradictions, explicitly note their scenario potential.

---

### 5. Emergence Detection

**What**: New patterns appearing for the first time — a new domain, a new tag cluster, or a previously dormant area suddenly gaining signals.

**How**:
- Track when a domain or tag appears for the first time in the database
- Track when a domain that had 0-2 signals suddenly gains 3+ in a short period
- Track when a previously "early" signal cluster receives its first "emerging" or higher signal
- Compare current database state against the last analysis timestamp

**Output schema**:
```json
{
  "type": "emergence",
  "id": "emerg-YYYY-MM-DD-NNN",
  "what": "New domain | New tag cluster | Domain activation | Strength threshold crossed",
  "details": "Specific description",
  "signals": ["sig-XXX", "sig-YYY"],
  "first_seen": "YYYY-MM-DD",
  "implication": "Why this emergence matters — what's newly on the radar",
  "date_detected": "YYYY-MM-DD"
}
```

---

### 6. Decay Detection

**What**: Drivers or domains where signals are aging without new additions or strength updates — the force may be stalling, reversing, or absorbed into the mainstream.

**How**:
- For each driver: check the most recent signal date. If all signals are > 12 months old, flag as potentially decaying.
- For each driver: check if any signal has had a strength downgrade in its history. Multiple downgrades = decay.
- For each driver: check if new signals have stopped being added while the driver was previously active (was gaining 1+ signals per quarter, now 0 for 6+ months).

**Output schema**:
```json
{
  "type": "decay",
  "id": "decay-YYYY-MM-DD-NNN",
  "driver_or_domain": "Name",
  "last_signal_date": "YYYY-MM-DD",
  "months_since_activity": 14,
  "possible_reasons": "Stalling | Reversed | Absorbed into mainstream | Insufficient monitoring",
  "recommendation": "Review and update | Archive | Reclassify",
  "date_detected": "YYYY-MM-DD"
}
```

---

### 7. Gap Analysis (STEEP+V Coverage)

**What**: Identifies blind spots in signal coverage across the six STEEP+V categories.

**How**:
- Categorize all signals by their driver categories (social, technological, economic, environmental, political, values)
- Count signals per category
- Flag categories with < 10% of total signals as underrepresented
- Flag categories with 0 signals as blind spots
- Within covered categories, check for recency — a category where all signals are > 6 months old is functionally a gap
- Compare coverage against the user's active domains — if they work in healthcare but have no environmental signals, that's a relevant gap (healthcare is deeply affected by environmental forces)

**Output schema**:
```json
{
  "type": "gap",
  "id": "gap-YYYY-MM-DD-NNN",
  "category": "STEEP+V category name",
  "signal_count": 2,
  "percentage_of_total": 3.5,
  "severity": "blind-spot | underrepresented | stale",
  "recommendation": "Run a targeted signal scan for [category] signals in [relevant domains]",
  "date_detected": "YYYY-MM-DD"
}
```

---

## Insight Surfacing Rules

Not every detected pattern should be announced. Use these rules to decide what to surface to the user and when:

### Always Surface (proactively, at session start)
- New cross-domain convergences (type: convergence) — these are the highest-value insights
- Accelerations involving 3+ signals — something is moving fast
- New contradictions that haven't been used in a scenario yet — prime material
- Blind spots in STEEP+V coverage relevant to the user's current topic

### Surface on Request or When Relevant
- Cluster proposals — when the user is doing a Signal Scan or building scenarios
- Emergence detections — when the user asks "what's new?" or is scanning a domain
- Decay detections — when the user references a driver that may be stalling

### Log Silently (available via query)
- Tentative clusters with low confidence
- Gaps in categories not related to the user's current work
- Decays in domains the user hasn't engaged with recently

### Surfacing Format

When surfacing insights at session start:

> **Signal Database Briefing** *(from [N] stored signals across [M] domains)*
>
> **Accelerating**: [Driver name] — [N] signals have upgraded strength since [date]. [One-sentence implication.]
>
> **New convergence**: Signals in [domain A] and [domain B] are pointing in the same direction: [direction]. This suggests [proposed driver]. [One-sentence significance.]
>
> **Active contradiction**: In [domain], [signal A direction] vs. [signal B direction]. This tension could be a scenario axis.
>
> **Blind spot**: Your [category] signal coverage is thin. Consider a targeted scan.

Keep the briefing to 3-5 bullet points maximum. Link to signal IDs so the user can drill down.

---

## Periodic Maintenance Recommendations

After running analysis, check if any of these maintenance actions are warranted and suggest them to the user:

- **Confirm or dismiss proposed clusters** — don't let unconfirmed clusters accumulate indefinitely
- **Update stale signals** — any signal > 12 months without review should be re-assessed
- **Archive obsolete signals** — mark as obsolete with a note, don't delete (preserves history)
- **Merge duplicate signals** — if the same development was captured from different scans, consolidate
- **Promote confirmed clusters to drivers** — once a cluster is confirmed, create the driver entry in `graph.json`

Suggest maintenance when the database has > 5 unconfirmed clusters, > 10 stale signals, or hasn't been maintained in 3+ months.

---

## Integration with Other Modes

### Signal Scan
- After scan: run full analysis, surface all new patterns
- Offer to confirm/dismiss any proposed clusters

### Scenario
- Before building: surface active contradictions as candidate scenario axes
- After building: tag which contradictions were used (status: "used-in-scenario")

### Forecast
- Before writing: surface accelerations and convergences as potential forecast foundations
- The strongest forecasts are built on accelerating drivers with cross-domain convergence

### Investment Memo
- Surface relevant accelerations (timing signal), contradictions (risk), and gaps (blind spots in the analysis)

### Challenge
- Surface contradictions as built-in counter-evidence
- Surface gaps as areas where the user's assumptions are untested
