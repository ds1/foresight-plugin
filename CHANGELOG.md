# Changelog

## 1.1.0 — 2026-09-23

- User guide at `docs/guide.md`; website at https://fore.si.
- Bundles the read-only foresight.agt MCP server (`.mcp.json` → `https://fore.si/mcp`), and the skill uses it as extra evidence.
- The manifest input now advertises the mcp endpoint.

## 1.0.0 — 2026-09-23

- First release as a Claude Code plugin and marketplace, generated from foresight-md `skill/`.
- Signal store resolves outside the plugin folder (`FORESIGHT_SIGNALS_DIR`, `~/.claude/foresight/signals/`, or the legacy `~/.claude/commands/foresight/signals/`), initialized from bundled empty templates.
- Added the `foresight.agt` identity section and the manifest input in `agt/`.
