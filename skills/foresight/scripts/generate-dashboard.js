#!/usr/bin/env node
/**
 * Signal Database Dashboard Generator
 *
 * Reads database.json, graph.json, and insights.json from the signals directory
 * and produces a self-contained HTML dashboard file.
 *
 * Usage:
 *   node generate-dashboard.js [signals-dir]
 *
 * If no directory is specified, uses the directory containing this script.
 * Output: dashboard.html in the same directory.
 */

const fs = require('fs');
const path = require('path');

const signalsDir = process.argv[2] || __dirname;
const outputPath = path.join(signalsDir, 'dashboard.html');

function readJSON(filename) {
  const filepath = path.join(signalsDir, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

const database = readJSON('database.json') || { signals: [], metadata: {} };
const graph = readJSON('graph.json') || { drivers: {}, connections: [], metadata: {} };
const insights = readJSON('insights.json') || { clusters: [], convergences: [], accelerations: [], contradictions: [], emergences: [], decays: [], gaps: [], metadata: {} };

const signals = database.signals || [];
const drivers = graph.drivers || {};
const connections = graph.connections || [];

// Compute stats
const totalSignals = signals.length;
const totalDrivers = Object.keys(drivers).length;
const totalConnections = connections.length;
const totalInsights = (insights.clusters?.length || 0) + (insights.convergences?.length || 0) +
  (insights.accelerations?.length || 0) + (insights.contradictions?.length || 0) +
  (insights.emergences?.length || 0) + (insights.decays?.length || 0) + (insights.gaps?.length || 0);

// Strength distribution
const strengthDist = { early: 0, emerging: 0, accelerating: 0, mainstream: 0 };
signals.forEach(s => { if (strengthDist[s.strength] !== undefined) strengthDist[s.strength]++; });

// STEEP+V coverage
const steepv = { social: 0, technological: 0, economic: 0, environmental: 0, political: 0, values: 0 };
Object.values(drivers).forEach(d => {
  const cat = (d.category || '').toLowerCase();
  if (steepv[cat] !== undefined) steepv[cat] += (d.signals || []).length;
});
// Also count signals by domain keyword as fallback
signals.forEach(s => {
  (s.domain || []).forEach(d => {
    const dl = d.toLowerCase();
    Object.keys(steepv).forEach(cat => {
      if (dl.includes(cat)) steepv[cat]++;
    });
  });
});

// Domain counts
const domainCounts = {};
signals.forEach(s => {
  (s.domain || []).forEach(d => {
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });
});

// Timeline data
const timelineData = signals.map(s => ({
  date: s.date_observed,
  title: s.title,
  strength: s.strength,
  id: s.id
})).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Signal Database Dashboard</title>
<style>
  :root {
    --bg: #0f172a; --surface: #1e293b; --surface2: #334155; --border: #475569;
    --text: #e2e8f0; --text-muted: #94a3b8; --accent: #3b82f6; --accent2: #8b5cf6;
    --green: #22c55e; --yellow: #eab308; --orange: #f97316; --red: #ef4444; --cyan: #06b6d4;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding: 24px; }

  .header { margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .header .subtitle { color: var(--text-muted); font-size: 14px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .stat-card .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px; }
  .stat-card .value { font-size: 32px; font-weight: 700; }
  .stat-card .value.accent { color: var(--accent); }
  .stat-card .value.green { color: var(--green); }
  .stat-card .value.purple { color: var(--accent2); }
  .stat-card .value.cyan { color: var(--cyan); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }

  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
  .panel h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
  .panel h3 { font-size: 13px; font-weight: 600; margin: 16px 0 8px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  /* Strength bars */
  .strength-bars { display: flex; flex-direction: column; gap: 12px; }
  .strength-row { display: flex; align-items: center; gap: 12px; }
  .strength-label { width: 100px; font-size: 13px; text-transform: capitalize; color: var(--text-muted); }
  .strength-bar { flex: 1; height: 28px; border-radius: 6px; background: var(--surface2); position: relative; overflow: hidden; }
  .strength-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 10px; font-size: 12px; font-weight: 600; transition: width 0.3s; }
  .strength-fill.early { background: var(--border); }
  .strength-fill.emerging { background: var(--yellow); color: #000; }
  .strength-fill.accelerating { background: var(--orange); color: #000; }
  .strength-fill.mainstream { background: var(--green); color: #000; }
  .strength-count { min-width: 30px; text-align: right; font-size: 14px; font-weight: 600; }

  /* STEEP+V radar (simplified as horizontal bars) */
  .steepv-bars { display: flex; flex-direction: column; gap: 10px; }
  .steepv-row { display: flex; align-items: center; gap: 12px; }
  .steepv-label { width: 110px; font-size: 13px; text-transform: capitalize; color: var(--text-muted); }
  .steepv-bar { flex: 1; height: 24px; border-radius: 6px; background: var(--surface2); overflow: hidden; }
  .steepv-fill { height: 100%; border-radius: 6px; background: var(--accent); display: flex; align-items: center; padding-left: 8px; font-size: 11px; font-weight: 600; }
  .steepv-fill.zero { background: var(--red); opacity: 0.4; width: 100% !important; }
  .steepv-count { min-width: 30px; text-align: right; font-size: 13px; color: var(--text-muted); }

  /* Insights */
  .insight-card { background: var(--surface2); border-radius: 8px; padding: 14px; margin-bottom: 10px; border-left: 3px solid var(--accent); }
  .insight-card.convergence { border-left-color: var(--green); }
  .insight-card.acceleration { border-left-color: var(--orange); }
  .insight-card.contradiction { border-left-color: var(--red); }
  .insight-card.cluster { border-left-color: var(--accent2); }
  .insight-card.emergence { border-left-color: var(--cyan); }
  .insight-card.decay { border-left-color: var(--text-muted); }
  .insight-card.gap { border-left-color: var(--yellow); }
  .insight-type { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 4px; }
  .insight-text { font-size: 13px; }

  /* Signal table */
  .table-container { overflow-x: auto; margin-top: 32px; }
  .table-controls { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .table-controls input, .table-controls select { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; color: var(--text); font-size: 13px; }
  .table-controls input { flex: 1; min-width: 200px; }
  .table-controls select { min-width: 140px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: var(--surface2); padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); cursor: pointer; user-select: none; border-bottom: 2px solid var(--border); white-space: nowrap; }
  th:hover { color: var(--text); }
  th.sorted-asc::after { content: ' \\u25B2'; font-size: 10px; }
  th.sorted-desc::after { content: ' \\u25BC'; font-size: 10px; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--surface2); vertical-align: top; }
  tr:hover td { background: rgba(59, 130, 246, 0.05); }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge.early { background: var(--surface2); color: var(--text-muted); }
  .badge.emerging { background: rgba(234, 179, 8, 0.15); color: var(--yellow); }
  .badge.accelerating { background: rgba(249, 115, 22, 0.15); color: var(--orange); }
  .badge.mainstream { background: rgba(34, 197, 94, 0.15); color: var(--green); }

  .tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; background: var(--surface2); color: var(--text-muted); margin: 1px 2px; }

  .domain-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: rgba(139, 92, 246, 0.15); color: var(--accent2); margin: 1px 2px; }

  /* Driver list */
  .driver-card { background: var(--surface2); border-radius: 8px; padding: 14px; margin-bottom: 10px; }
  .driver-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .driver-meta { font-size: 12px; color: var(--text-muted); }
  .driver-direction { font-size: 12px; color: var(--cyan); margin-top: 4px; }
  .driver-signals { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

  /* Network graph */
  .graph-container { width: 100%; height: 500px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); position: relative; overflow: hidden; }
  .graph-container canvas { width: 100%; height: 100%; }
  .graph-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 14px; }

  /* Empty state */
  .empty-state { text-align: center; padding: 60px 24px; color: var(--text-muted); }
  .empty-state h2 { font-size: 20px; margin-bottom: 8px; color: var(--text); }
  .empty-state p { font-size: 14px; max-width: 500px; margin: 0 auto; }

  /* Timeline */
  .timeline { position: relative; padding-left: 24px; }
  .timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: var(--surface2); }
  .timeline-item { position: relative; margin-bottom: 16px; padding-left: 20px; }
  .timeline-item::before { content: ''; position: absolute; left: -20px; top: 6px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--accent); background: var(--bg); }
  .timeline-item.accelerating::before { border-color: var(--orange); }
  .timeline-item.emerging::before { border-color: var(--yellow); }
  .timeline-item.mainstream::before { border-color: var(--green); }
  .timeline-date { font-size: 11px; color: var(--text-muted); }
  .timeline-title { font-size: 13px; }

  .section-title { font-size: 20px; font-weight: 700; margin: 40px 0 20px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
</style>
</head>
<body>

<div class="header">
  <h1>/foresight Signal Database</h1>
  <div class="subtitle">Last updated: ${database.metadata?.last_updated || 'Never'} &middot; Generated: ${new Date().toISOString().split('T')[0]}</div>
</div>

${totalSignals === 0 ? `
<div class="empty-state">
  <h2>No signals yet</h2>
  <p>Run <code>/foresight</code> with a Signal Scan to start building your database. Signals accumulate across sessions, and this dashboard updates automatically.</p>
</div>
` : `

<!-- Stats -->
<div class="stats-grid">
  <div class="stat-card"><div class="label">Signals</div><div class="value accent">${totalSignals}</div></div>
  <div class="stat-card"><div class="label">Drivers</div><div class="value purple">${totalDrivers}</div></div>
  <div class="stat-card"><div class="label">Connections</div><div class="value cyan">${totalConnections}</div></div>
  <div class="stat-card"><div class="label">Insights</div><div class="value green">${totalInsights}</div></div>
  <div class="stat-card"><div class="label">Domains</div><div class="value">${Object.keys(domainCounts).length}</div></div>
</div>

<!-- Strength + STEEP+V -->
<div class="grid-2">
  <div class="panel">
    <h2>Signal Strength Distribution</h2>
    <div class="strength-bars">
      ${['mainstream', 'accelerating', 'emerging', 'early'].map(level => {
        const count = strengthDist[level];
        const pct = totalSignals > 0 ? (count / totalSignals * 100) : 0;
        return `<div class="strength-row">
          <div class="strength-label">${level}</div>
          <div class="strength-bar"><div class="strength-fill ${level}" style="width: ${Math.max(pct, count > 0 ? 8 : 0)}%">${count > 0 ? count : ''}</div></div>
          <div class="strength-count">${count}</div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <div class="panel">
    <h2>STEEP+V Coverage</h2>
    <div class="steepv-bars">
      ${Object.entries(steepv).map(([cat, count]) => {
        const maxCount = Math.max(...Object.values(steepv), 1);
        const pct = (count / maxCount * 100);
        return `<div class="steepv-row">
          <div class="steepv-label">${cat}</div>
          <div class="steepv-bar"><div class="steepv-fill ${count === 0 ? 'zero' : ''}" style="width: ${count === 0 ? '100' : Math.max(pct, 8)}%">${count === 0 ? 'BLIND SPOT' : ''}</div></div>
          <div class="steepv-count">${count}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>

<!-- Insights + Drivers -->
<div class="grid-2">
  <div class="panel">
    <h2>Active Insights</h2>
    ${totalInsights === 0 ? '<div style="color:var(--text-muted);font-size:13px;">No insights yet. Run more signal scans to enable pattern detection.</div>' : ''}
    ${(insights.convergences || []).map(c => `<div class="insight-card convergence"><div class="insight-type">Cross-Domain Convergence</div><div class="insight-text">${c.significance || c.direction || JSON.stringify(c)}</div></div>`).join('')}
    ${(insights.accelerations || []).map(a => `<div class="insight-card acceleration"><div class="insight-type">Acceleration</div><div class="insight-text">${a.implication || a.name || JSON.stringify(a)}</div></div>`).join('')}
    ${(insights.contradictions || []).map(c => `<div class="insight-card contradiction"><div class="insight-type">Contradiction</div><div class="insight-text">${c.tension || JSON.stringify(c)}</div></div>`).join('')}
    ${(insights.clusters || []).map(c => `<div class="insight-card cluster"><div class="insight-type">Proposed Cluster</div><div class="insight-text">${c.proposed_driver || JSON.stringify(c)} (${(c.signals || []).length} signals)</div></div>`).join('')}
    ${(insights.emergences || []).map(e => `<div class="insight-card emergence"><div class="insight-type">Emergence</div><div class="insight-text">${e.details || e.what || JSON.stringify(e)}</div></div>`).join('')}
    ${(insights.decays || []).map(d => `<div class="insight-card decay"><div class="insight-type">Decay</div><div class="insight-text">${d.driver_or_domain || JSON.stringify(d)}: ${d.possible_reasons || ''}</div></div>`).join('')}
    ${(insights.gaps || []).map(g => `<div class="insight-card gap"><div class="insight-type">Coverage Gap</div><div class="insight-text">${g.category}: ${g.recommendation || g.severity || ''}</div></div>`).join('')}
  </div>

  <div class="panel">
    <h2>Drivers (${totalDrivers})</h2>
    ${totalDrivers === 0 ? '<div style="color:var(--text-muted);font-size:13px;">No drivers mapped yet.</div>' : ''}
    ${Object.entries(drivers).sort((a, b) => {
      const order = { dominant: 0, strong: 1, moderate: 2, weak: 3 };
      return (order[a[1].strength] ?? 4) - (order[b[1].strength] ?? 4);
    }).map(([slug, d]) => `<div class="driver-card">
      <div class="driver-name">${d.name || slug} <span class="badge ${d.strength || ''}">${d.strength || '?'}</span></div>
      <div class="driver-meta">${d.category || ''} &middot; ${(d.signals || []).length} signals</div>
      ${d.direction ? `<div class="driver-direction">${d.direction}</div>` : ''}
    </div>`).join('')}
  </div>
</div>

<!-- Network Graph -->
<div class="section-title">Signal Network</div>
<div class="panel">
  <div class="graph-container" id="graph">
    <canvas id="graphCanvas"></canvas>
  </div>
</div>

<!-- Timeline -->
${timelineData.length > 0 ? `
<div class="section-title">Signal Timeline</div>
<div class="panel">
  <div class="timeline">
    ${timelineData.slice(-30).reverse().map(t => `<div class="timeline-item ${t.strength || ''}">
      <div class="timeline-date">${t.date || 'undated'}</div>
      <div class="timeline-title">${t.title || t.id} <span class="badge ${t.strength || ''}">${t.strength || ''}</span></div>
    </div>`).join('')}
  </div>
</div>
` : ''}

<!-- Signal Table -->
<div class="section-title">All Signals</div>
<div class="panel">
  <div class="table-controls">
    <input type="text" id="searchInput" placeholder="Search signals..." oninput="filterTable()">
    <select id="strengthFilter" onchange="filterTable()">
      <option value="">All strengths</option>
      <option value="early">Early</option>
      <option value="emerging">Emerging</option>
      <option value="accelerating">Accelerating</option>
      <option value="mainstream">Mainstream</option>
    </select>
    <select id="domainFilter" onchange="filterTable()">
      <option value="">All domains</option>
      ${Object.keys(domainCounts).sort().map(d => `<option value="${d}">${d} (${domainCounts[d]})</option>`).join('')}
    </select>
  </div>
  <div class="table-container">
    <table id="signalTable">
      <thead>
        <tr>
          <th onclick="sortTable(0)">Date</th>
          <th onclick="sortTable(1)">Title</th>
          <th onclick="sortTable(2)">Strength</th>
          <th onclick="sortTable(3)">Domain</th>
          <th onclick="sortTable(4)">Direction</th>
          <th onclick="sortTable(5)">Source</th>
        </tr>
      </thead>
      <tbody>
        ${signals.map(s => `<tr data-strength="${s.strength || ''}" data-domains="${(s.domain || []).join(',')}" data-search="${[s.title, s.description, ...(s.tags || []), ...(s.domain || []), s.direction].join(' ').toLowerCase()}">
          <td style="white-space:nowrap">${s.date_observed || ''}</td>
          <td><strong>${s.title || s.id}</strong>${s.description ? `<br><span style="font-size:11px;color:var(--text-muted)">${s.description.substring(0, 120)}${s.description.length > 120 ? '...' : ''}</span>` : ''}${(s.tags || []).length > 0 ? `<br>${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}` : ''}</td>
          <td><span class="badge ${s.strength || ''}">${s.strength || '?'}</span></td>
          <td>${(s.domain || []).map(d => `<span class="domain-chip">${d}</span>`).join('')}</td>
          <td style="font-size:12px">${s.direction || ''}</td>
          <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${s.source ? (s.source.startsWith('http') ? `<a href="${s.source}" target="_blank" style="color:var(--accent)">${s.source_type || 'link'}</a>` : s.source) : ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>
`}

<script>
// Table filtering
function filterTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const strength = document.getElementById('strengthFilter').value;
  const domain = document.getElementById('domainFilter').value;
  const rows = document.querySelectorAll('#signalTable tbody tr');
  rows.forEach(row => {
    const matchSearch = !search || row.dataset.search.includes(search);
    const matchStrength = !strength || row.dataset.strength === strength;
    const matchDomain = !domain || row.dataset.domains.includes(domain);
    row.style.display = (matchSearch && matchStrength && matchDomain) ? '' : 'none';
  });
}

// Table sorting
let sortCol = -1, sortDir = 1;
function sortTable(col) {
  const table = document.getElementById('signalTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const headers = table.querySelectorAll('th');

  if (sortCol === col) { sortDir *= -1; } else { sortDir = 1; sortCol = col; }
  headers.forEach((h, i) => { h.className = i === col ? (sortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''; });

  rows.sort((a, b) => {
    const aVal = a.cells[col].textContent.trim().toLowerCase();
    const bVal = b.cells[col].textContent.trim().toLowerCase();
    return aVal.localeCompare(bVal) * sortDir;
  });
  rows.forEach(r => tbody.appendChild(r));
}

// Simple force-directed graph
(function drawGraph() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;

  const signals = ${JSON.stringify(signals.map(s => ({ id: s.id, title: s.title, strength: s.strength, drivers: s.drivers || [] })))};
  const drivers = ${JSON.stringify(Object.entries(drivers).map(([slug, d]) => ({ id: slug, name: d.name || slug, strength: d.strength, signals: d.signals || [] })))};
  const connections = ${JSON.stringify(connections.map(c => ({ from: c.from, to: c.to, type: c.relationship })))};

  if (signals.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No signals to visualize', canvas.width/2, canvas.height/2);
    return;
  }

  // Create nodes for signals and drivers
  const nodes = [];
  const nodeMap = {};

  drivers.forEach((d, i) => {
    const node = { id: d.id, label: d.name, type: 'driver', x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: 0, vy: 0, radius: 14 + (d.signals.length * 2) };
    nodes.push(node);
    nodeMap[d.id] = node;
  });

  signals.forEach((s, i) => {
    const node = { id: s.id, label: s.title || s.id, type: 'signal', strength: s.strength, x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: 0, vy: 0, radius: 6 };
    nodes.push(node);
    nodeMap[s.id] = node;
  });

  // Create edges
  const edges = [];
  drivers.forEach(d => {
    d.signals.forEach(sid => {
      if (nodeMap[sid] && nodeMap[d.id]) edges.push({ from: nodeMap[d.id], to: nodeMap[sid], type: 'driver' });
    });
  });
  connections.forEach(c => {
    if (nodeMap[c.from] && nodeMap[c.to]) edges.push({ from: nodeMap[c.from], to: nodeMap[c.to], type: c.type });
  });

  // Simple force simulation
  const strengthColors = { early: '#475569', emerging: '#eab308', accelerating: '#f97316', mainstream: '#22c55e' };

  function simulate() {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i+1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx*dx + dy*dy) || 1;
        let force = 800 / (dist * dist);
        nodes[i].vx -= dx/dist * force;
        nodes[i].vy -= dy/dist * force;
        nodes[j].vx += dx/dist * force;
        nodes[j].vy += dy/dist * force;
      }
    }
    // Attraction along edges
    edges.forEach(e => {
      let dx = e.to.x - e.from.x;
      let dy = e.to.y - e.from.y;
      let dist = Math.sqrt(dx*dx + dy*dy) || 1;
      let force = (dist - 80) * 0.01;
      e.from.vx += dx/dist * force;
      e.from.vy += dy/dist * force;
      e.to.vx -= dx/dist * force;
      e.to.vy -= dy/dist * force;
    });
    // Center gravity
    nodes.forEach(n => {
      n.vx += (canvas.width/2 - n.x) * 0.001;
      n.vy += (canvas.height/2 - n.y) * 0.001;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.radius, Math.min(canvas.width - n.radius, n.x));
      n.y = Math.max(n.radius, Math.min(canvas.height - n.radius, n.y));
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Edges
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.strokeStyle = e.type === 'contradicts' ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.15)';
      ctx.lineWidth = e.type === 'driver' ? 1 : 0.5;
      ctx.stroke();
    });
    // Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      if (n.type === 'driver') {
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(n.label.substring(0, 20), n.x, n.y + n.radius + 14);
      } else {
        ctx.fillStyle = strengthColors[n.strength] || '#475569';
        ctx.fill();
      }
    });
  }

  // Run simulation
  for (let i = 0; i < 200; i++) simulate();
  draw();

  // Hover tooltips
  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = null;
    nodes.forEach(n => {
      const dist = Math.sqrt((mx-n.x)**2 + (my-n.y)**2);
      if (dist < n.radius + 4) found = n;
    });
    canvas.title = found ? found.label : '';
    canvas.style.cursor = found ? 'pointer' : 'default';
  });
})();
</script>

</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`Dashboard generated: ${outputPath}`);
console.log(`  ${totalSignals} signals, ${totalDrivers} drivers, ${totalConnections} connections, ${totalInsights} insights`);
