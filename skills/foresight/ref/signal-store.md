# Signal Store — Persistent Signal Database Reference

The signal store is a persistent, growing knowledge base at `~/.claude/commands/foresight/signals/` (installed) or `skill/signals/` inside the `foresight-md` repository — the repo copy is committed and is the source of truth for the autonomous pipeline in `pipeline/`. It accumulates signals across sessions, tracks their evolution over time, maps connections between them, and clusters them into drivers.

> **Pipeline note:** when running under `pipeline/AUTOPUBLISH.md`, do not hand-edit the JSON files. Write signals, drivers and connections through `node pipeline/run.js` (which calls `pipeline/lib/store.js`) so IDs, validation, `history`, `index.md` and the `scans/` snapshot stay consistent.

## File Structure

```
signals/
├── index.md          # Human-readable overview (auto-maintained)
├── database.json     # All signals, structured and queryable
├── graph.json        # Driver clusters + signal-to-signal connections
└── scans/            # Timestamped scan session snapshots
    └── YYYY-MM-DD-topic-name.md
```

---

## Signal Schema

Each signal in `database.json` follows this structure:

```json
{
  "id": "sig-YYYY-MM-DD-NNN",
  "title": "Short descriptive name",
  "description": "What is actually happening. Factual, specific, sourced.",
  "source": "URL, DOI, or formal citation",
  "source_type": "peer-reviewed | institutional | grey-lit | journalism | disclosure | expert",
  "domain": ["primary-domain", "secondary-domain"],
  "drivers": ["driver-slug-1", "driver-slug-2"],
  "direction": "From [current state] → To [future state]",
  "strength": "early | emerging | accelerating | mainstream",
  "date_observed": "YYYY-MM-DD",
  "date_sourced": "YYYY-MM or YYYY-MM-DD",
  "tags": ["searchable", "keywords"],
  "positive_implications": "Brief note on opportunity/upside",
  "shadow_implications": "Brief note on risk/downside/exploitation",
  "related_signals": ["sig-XXX", "sig-YYY"],
  "notes": "Additional context, caveats, or analyst commentary",
  "history": [
    {
      "date": "YYYY-MM-DD",
      "strength": "previous-strength",
      "note": "Why it changed"
    }
  ]
}
```

### Field Rules
- **id**: Format `sig-YYYY-MM-DD-NNN` where NNN is a zero-padded sequential number within that date
- **source_type**: Must match the source hierarchy from `ref/signals.md`
- **domain**: Use consistent slugs (lowercase, hyphenated). Check existing signals for established domain names before creating new ones.
- **drivers**: Use consistent driver slugs. Check `graph.json` for established driver names before creating new ones.
- **strength**: Use exactly one of: `early`, `emerging`, `accelerating`, `mainstream`
- **history**: Append an entry whenever strength is re-assessed. Preserves the evolution timeline.
- **related_signals**: Cross-reference by signal ID. Update both signals when adding a connection.

---

## Driver Schema (in graph.json)

```json
{
  "drivers": {
    "driver-slug": {
      "name": "Human-Readable Driver Name",
      "description": "What this force is and where it's pushing",
      "direction": "From [current state] → To [future state]",
      "strength": "weak | moderate | strong | dominant",
      "category": "social | technological | economic | environmental | political | values",
      "signals": ["sig-XXX", "sig-YYY"],
      "related_drivers": ["other-driver-slug"],
      "first_observed": "YYYY-MM-DD",
      "last_updated": "YYYY-MM-DD"
    }
  }
}
```

## Connection Schema (in graph.json)

```json
{
  "connections": [
    {
      "from": "sig-XXX",
      "to": "sig-YYY",
      "relationship": "reinforces | contradicts | enables | consequence-of | parallel",
      "note": "Brief explanation of the connection",
      "date_added": "YYYY-MM-DD"
    }
  ]
}
```

Relationship types:
- **reinforces**: Signal A makes Signal B stronger or more likely
- **contradicts**: Signal A pushes against Signal B
- **enables**: Signal A creates conditions for Signal B to exist
- **consequence-of**: Signal A is a downstream effect of Signal B
- **parallel**: Signals are independent but point in the same direction (suggesting a shared driver)

---

## Operations

### Before a Signal Scan

Always read `database.json` and `graph.json` before starting a new scan. Check for existing signals in the requested domain.

If relevant signals already exist, present the user with options (**Headless style: do not ask — assume option 1, Build on existing**):

> I found **[N] existing signals** in the **[domain]** area, last updated **[date]**. How would you like to proceed?
>
> 1. **Build on existing** — I'll review what we have, update strength ratings, add new signals, and flag any that may be stale or obsolete. Best for tracking a domain over time.
>
> 2. **Start fresh** — I'll do a clean scan ignoring existing signals. Best when the landscape has shifted dramatically or you want an unbiased fresh look.
>
> 3. **Review and curate** — I'll walk through existing signals with you: confirm, update, remove stale ones, add connections. Best for maintaining signal quality.
>
> 4. **Query the database** — Search existing signals by domain, driver, tag, strength, or date. Best when you need to pull signals for a scenario, forecast, or memo.

### After a Signal Scan

After producing scan output:

1. **Save new signals** to `database.json` — assign IDs, fill all fields
2. **Update existing signals** — re-assess strength if a known signal has evolved
3. **Add to graph.json** — create/update driver entries, add signal-to-driver mappings, add signal-to-signal connections
4. **Save scan snapshot** to `scans/YYYY-MM-DD-topic-name.md` — the full human-readable scan output
5. **Update index.md** — add scan entry, update stats, refresh driver list and recent signals

### When Building Scenarios, Forecasts, or Memos

Before generating new signals from scratch, query the database:
1. Search by domain and tags relevant to the topic
2. Pull in existing signals as evidence (cite by signal ID)
3. Check for existing driver clusters that apply
4. Identify signal connections that suggest causal chains
5. Supplement with new research as needed — then save those new signals too

### Signal Aging and Maintenance

Signals degrade over time. Apply these rules:

- **Date check**: A signal more than 12 months old without a strength update should be flagged for review
- **Strength trajectory**: If a signal hasn't advanced in strength after 12+ months, it may be stalling — note this
- **Obsolescence**: If a signal's source event has been reversed, superseded, or debunked, mark it with `"strength": "obsolete"` and add a history note explaining why
- **Convergence**: When 3+ independent signals cluster around the same driver, that driver should be upgraded in strength

---

## Querying the Database

The skill should support these query patterns:

### By Domain
"Show me all signals in the [AI / climate / labor / etc.] domain"
→ Filter `database.json` where domain array includes the search term

### By Driver
"What signals support the [driver name] driver?"
→ Look up driver in `graph.json`, return its signal list, then fetch those from `database.json`

### By Strength
"What's accelerating right now?"
→ Filter `database.json` where strength = "accelerating"

### By Tag
"Find signals tagged [keyword]"
→ Filter `database.json` where tags array includes the search term

### By Recency
"What's new since [date]?"
→ Filter `database.json` where date_observed >= date

### By Connection
"What signals are connected to [signal ID or title]?"
→ Look up connections in `graph.json` involving that signal ID

### Cross-Domain
"Where do [domain A] and [domain B] intersect?"
→ Find signals that have both domains, or connections between signals in different domains

### Driver Landscape
"Show me all active drivers and their strength"
→ Dump the drivers object from `graph.json`, sorted by strength

---

## Index Maintenance

After any database modification, update `index.md` with:

```markdown
## Stats
- **Total signals:** [count]
- **Total drivers:** [count]
- **Last updated:** [date]

## Recent Scans
- [YYYY-MM-DD — Topic Name](scans/YYYY-MM-DD-topic-name.md) — [N] signals, [key finding summary]

## Active Drivers (by strength)
### Dominant
- **Driver Name** — [brief description] ([N] signals)
### Strong
- ...
### Moderate
- ...

## Recent Signals (last 10 added)
- `sig-XXX` — [title] ([strength], [domain])
```
