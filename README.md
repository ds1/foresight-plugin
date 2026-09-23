# Foresight — a Claude Code plugin · `foresight.agt`

Strategic futures thinking and content production inside Claude Code. Foresight turns Claude into a rigorous foresight analyst grounded in IFTF methodology, Stanford's Playbook for Strategic Foresight, and structured analytic techniques. It scans for signals of change, builds divergent scenarios, writes evidence-based forecasts and artifacts from the future, pressure-tests strategies, and backcasts roadmaps, backed by a signal database that grows across sessions.

**Website: [fore.si](https://fore.si)**. **Full guide: [docs/guide.md](docs/guide.md)**

The plugin is published as the agent **`foresight.agt`** on AGT Registry v2 (Polygon). Its manifest is signed by the name's on-chain owner and points back to this repository.

## Install

```
/plugin marketplace add ds1/foresight-plugin
/plugin install foresight@foresight
```

Then run `/foresight` (or `/foresight:foresight` if another `/foresight` command is installed) and follow the intake: topic, interaction style, mode.

## Modes

| Mode | What you get |
|------|-------------|
| **Signal Scan** | What's changing in a domain, clustered by driving forces |
| **Scenario** | 3–4 genuinely divergent futures on a 2x2 uncertainty matrix |
| **Forecast** | One bold, evidence-based claim with signals, implications and shadow analysis |
| **Artifact** | A news article, product page, memo or other document from the future |
| **Implications** | Cascading 2nd- and 3rd-order consequences of a specific change |
| **Challenge** | Assumption testing, pre-mortem, red team and wildcard injection |
| **Backcast** | A roadmap working backward from a desired future to today's first moves |
| **Investment Memo** | Opportunity evaluation with scenario exposure analysis |
| **Historical Pattern** | Patterns, analogies and projections from history |

Interaction styles run from fully collaborative to one-shot, plus **New to this** (plain-language guidance) and **Headless** (no questions, for automation).

## Your signal database

Signals persist outside the plugin folder so updates never touch your data. The skill uses the first of:

1. a path you name, or `FORESIGHT_SIGNALS_DIR`
2. `~/.claude/foresight/signals/`
3. `~/.claude/commands/foresight/signals/` (the pre-plugin install location)
4. otherwise it creates `~/.claude/foresight/signals/` from the bundled empty templates

After each update it regenerates `dashboard.html` in that folder: a filterable signal table, driver network graph, STEEP+V coverage, insights and timeline.

## The foresight.agt MCP server

The plugin connects a read-only MCP server at `https://fore.si/mcp`: the signal database behind the published analysis at [foresight.domains/insights](https://foresight.domains/insights/), refreshed daily. The skill queries it as extra evidence alongside your local store. Any MCP-compatible client can use it on its own too:

```
claude mcp add foresight --transport http https://fore.si/mcp
```

Tools: `overview`, `search_signals`, `get_signal`, `list_drivers`, `get_driver`, `get_insights`, `list_scans`, `get_scan`.

## Verify foresight.agt

With the [`agt` plugin](https://github.com/agtnames/agt-plugins) installed, ask Claude to "resolve foresight.agt". A `verified: true` result means the manifest was signed by the wallet that owns the name on chain.

## Development

This repository is generated. The source of truth is the `skill/` folder of the foresight-md project; `node scripts/sync-plugin.js` there rebuilds `skills/foresight/`, and `--check` fails if this copy is stale. `agt/foresight.manifest.json` is the unsigned input for the name's manifest.

## License

MIT
