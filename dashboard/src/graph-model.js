// Pure graph, selection and timeline logic for the observatory. Plain ESM with no
// build step and no JSX, so `node:test` imports it directly; types live in
// graph-model.d.ts. Node IDs are `<kind>:<sessionId>:...` and session IDs never
// contain a colon (SAFE_ID in execution-model.js), so a session is always
// recoverable from a node ID.

export const short = (s, n = 8) => s.length > n ? `${s.slice(0, n)}…` : s;
export const human = (s) => s.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
export const fmtDate = (ts) => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Screen readers announce each node by this name instead of its concatenated card text.
const labelled = (nodes) => nodes.map((n) => ({ ...n, ariaLabel: `${human(n.data.kind)}: ${n.data.title}. ${human(n.data.state)}. ${n.data.subtitle}` }));

export const observationNodeId = (sessionId, event, index) => `observation:${sessionId}:${event.timestamp}:${event.type}:${index}`;

const isUnlinkedSignal = (event) => !event.dispatchId && (
  ['prompt', 'agent_resume', 'agent_stop'].includes(event.type) ||
  ['agent_start', 'agent_launch', 'agent_end'].includes(event.type));

export function arrangeGraph(nodes, edges) {
  const depth = new Map();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map();
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const next = outgoing.get(edge.source) ?? []; next.push(edge.target); outgoing.set(edge.source, next);
  }
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id).sort();
  for (const id of queue) depth.set(id, 0);
  while (queue.length) {
    const id = queue.shift();
    for (const target of outgoing.get(id) ?? []) {
      depth.set(target, Math.max(depth.get(target) ?? 0, (depth.get(id) ?? 0) + 1));
      const degree = (incoming.get(target) ?? 1) - 1; incoming.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }
  // Cycles are not expected in this observational graph, but remain visible in
  // the deterministic fallback column instead of being discarded.
  const maxDepth = Math.max(0, ...depth.values());
  const columns = new Map();
  for (const node of nodes) {
    const level = depth.get(node.id) ?? maxDepth + 1;
    const list = columns.get(level) ?? []; list.push(node); columns.set(level, list);
  }
  const tallest = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const positioned = new Map();
  for (const [level, column] of columns) {
    column.sort((a, b) => a.id.localeCompare(b.id));
    const offset = (tallest - column.length) * 72;
    column.forEach((node, index) => positioned.set(node.id, { x: 40 + level * 320, y: 32 + offset + index * 145 }));
  }
  return { nodes: nodes.map((node) => ({ ...node, position: positioned.get(node.id) })), edges };
}

export function referenceGraph() {
  const nodes = [{
    id: 'reference:request', type: 'studio', position: { x: 20, y: 235 },
    data: { title: 'Request', subtitle: 'Reference entry point', state: 'unknown', kind: 'reference', source: 'CanonKit guidance' },
  }, {
    id: 'reference:risk', type: 'studio', position: { x: 300, y: 235 },
    data: { title: 'Classify risk', subtitle: 'No classification observed', state: 'unknown', kind: 'decision', source: 'CanonKit guidance' },
  }];
  const edges = [{ id: 'reference-request-risk', source: 'reference:request', target: 'reference:risk', type: 'smoothstep', label: 'request' }];
  const routes = [
    { risk: 'LOW', y: 25, label: 'Direct · proportionate verification', steps: ['Implement', 'Verify proportionately', 'Close'] },
    { risk: 'MEDIUM', y: 205, label: 'Plan when needed · proportional review', steps: ['Plan when needed', 'Implement', 'Verify + review', 'Close'] },
    { risk: 'HIGH', y: 385, label: 'Risk analysis · independent review · controlled close', steps: ['Spec + acceptance when applicable', 'Analyze risks', 'Implement', 'Verify', 'Independent review', 'Integrate', 'Controlled close'] },
  ];
  for (const route of routes) {
    let previous = 'reference:risk';
    let x = 620;
    for (let i = 0; i < route.steps.length; i++) {
      const id = `reference:${route.risk.toLowerCase()}:${i}`;
      nodes.push({ id, type: 'studio', position: { x, y: route.y }, data: {
        title: route.steps[i], subtitle: `${route.risk} route · ${route.label}`, state: 'unknown', kind: 'reference',
        source: 'Reference path · not a session record',
        context: 'This conditional route is CanonKit guidance. It is not selected by observed session data.',
      } });
      edges.push({ id: `reference-${route.risk}-${i}`, source: previous, target: id, type: 'smoothstep', label: i === 0 ? `if ${route.risk}` : undefined });
      previous = id; x += 205;
    }
  }
  return { nodes, edges };
}

// One session's nodes and edges, as the single-session graph always built them.
// With `summarise`, uncorrelated runtime signals collapse into one node.
function sessionGraph(session, summarise) {
  const dispatches = session.dispatches;
  const gates = session.observations.filter((e) => e.type === 'gate');
  const sid = session.sessionId;
  const width = 280;
  const nodes = [{
    id: `session:${sid}`, type: 'studio', position: { x: 50, y: Math.max(40, (Math.max(dispatches.length, gates.length, 1) - 1) * 105) },
    data: { title: `Session ${short(sid, 12)}`, subtitle: 'Observed runtime session', state: 'observed', kind: 'session', source: 'Claude Code hook' },
  }];
  const edges = [];
  dispatches.forEach((d, i) => {
    const id = `dispatch:${sid}:${d.executionId}`;
    const when = d.startedAt ? fmtDate(d.startedAt) : 'Start not observed';
    nodes.push({ id, type: 'studio', position: { x: 410, y: 40 + i * 150 }, data: {
      title: d.agent ? human(d.agent) : `Dispatch ${short(d.executionId)}`,
      subtitle: `${when} · ${short(d.executionId)}${d.parallel ? ' · overlapping dispatch' : ''}`,
      state: d.executionState, kind: 'dispatch', source: d.evidence.map(human).join(' / '),
    } });
    // An active dispatch is a static dashed edge (see `.edge-active` in style.css), not
    // React Flow's `animated` one: its endless stroke animation kept the main thread busy.
    edges.push({ id: `session-dispatch-${sid}-${i}`, source: `session:${sid}`, target: id, type: 'smoothstep', label: 'dispatch', ...(d.executionState === 'active' ? { className: 'edge-active' } : {}) });
  });
  gates.forEach((g, i) => {
    const id = `gate:${sid}:${g.timestamp}:${i}`;
    const kind = typeof g.data.kind === 'string' ? g.data.kind : 'gate';
    // The pill shows the gate's decision; "completed" or "unknown" would misstate
    // an allow or a confirmation request.
    const decision = ['allowed', 'confirmation-requested', 'blocked'].includes(String(g.data.decision)) ? String(g.data.decision) : 'unknown';
    nodes.push({ id, type: 'studio', position: { x: 410 + width, y: 40 + i * 130 }, data: {
      title: human(kind), subtitle: `${fmtDate(g.timestamp)} · gate decision`,
      state: decision.replaceAll('-', '_'), kind: 'gate', source: 'CanonKit hook',
    } });
    edges.push({ id: `session-gate-${sid}-${i}`, source: `session:${sid}`, target: id, type: 'smoothstep', label: 'gate observed' });
  });
  const signals = [];
  session.observations.forEach((event, index) => { if (isUnlinkedSignal(event)) signals.push({ event, index }); });
  if (summarise) {
    if (signals.length) {
      const latest = Math.max(...signals.map((s) => s.event.timestamp));
      nodes.push({ id: `signals:${sid}`, type: 'studio', position: { x: 410 + width * 2, y: 40 }, data: {
        title: 'Runtime signals', subtitle: `${signals.length} uncorrelated · latest ${fmtDate(latest)}`,
        state: 'unknown', kind: 'observation', source: 'Runtime signals · no dispatch link observed',
      } });
      edges.push({ id: `session-signal-${sid}`, source: `session:${sid}`, target: `signals:${sid}`, type: 'smoothstep', label: 'session membership' });
    }
  } else {
    for (const { event, index } of signals) {
      const id = observationNodeId(sid, event, index);
      nodes.push({ id, type: 'studio', position: { x: 410 + width * 2, y: 40 + index * 110 }, data: {
        title: human(event.type), subtitle: `${fmtDate(event.timestamp)} · no dispatch link observed`,
        state: 'unknown', kind: 'observation', source: 'Runtime signal · uncorrelated',
      } });
      edges.push({ id: `session-signal-${sid}-${index}`, source: `session:${sid}`, target: id, type: 'smoothstep', label: 'session membership' });
    }
  }
  return arrangeGraph(nodes, edges);
}

const LANE_NODE_HEIGHT = 130;
const LANE_NODE_WIDTH = 280;
const LANE_PAD = 24;
const LANE_GAP = 40;

// Each session is arranged on its own and stacked into a lane below the previous
// one. No edge ever joins two sessions: nothing observed relates them.
export function graphFor(sessions, view) {
  if (view === 'reference') {
    const reference = referenceGraph();
    const arranged = arrangeGraph(reference.nodes, reference.edges);
    return { nodes: labelled(arranged.nodes), edges: arranged.edges };
  }
  if (!sessions.length) return { nodes: [], edges: [] };
  const lanes = sessions.length > 1;
  const nodes = [];
  const edges = [];
  let cursor = 0;
  for (const session of sessions) {
    const arranged = sessionGraph(session, lanes);
    if (!lanes) return { nodes: labelled(arranged.nodes), edges: arranged.edges };
    const maxX = Math.max(...arranged.nodes.map((n) => n.position.x));
    const maxY = Math.max(...arranged.nodes.map((n) => n.position.y));
    const height = maxY + LANE_NODE_HEIGHT + LANE_PAD;
    nodes.push({
      id: `lane:${session.sessionId}`, type: 'lane', className: 'lane-node', position: { x: 0, y: cursor },
      selectable: false, draggable: false, focusable: false, deletable: false, connectable: false,
      style: { width: maxX + LANE_NODE_WIDTH + 40, height },
      data: { title: `Session ${short(session.sessionId, 12)}`, subtitle: 'Lane', state: 'observed', kind: 'lane' },
    });
    for (const n of labelled(arranged.nodes)) nodes.push({ ...n, position: { x: n.position.x, y: n.position.y + cursor } });
    edges.push(...arranged.edges);
    cursor += height + LANE_GAP;
  }
  return { nodes, edges };
}

// Preserve React Flow's user-owned positions across data-only polls. Existing
// lanes keep their top edge; if one grows toward the next lane, new nodes use
// extra columns inside the available height instead of overlapping lanes.
export function preserveGraphNodes(graphNodes, currentNodes) {
  const kept = new Map(currentNodes.map((node) => [node.id, node]));
  const laneList = graphNodes.filter((node) => node.type === 'lane');
  const graphLanes = new Map(laneList.map((node) => [node.id, node]));
  const laneGeometry = new Map();
  for (let i = 0; i < laneList.length; i++) {
    const lane = laneList[i];
    const prior = kept.get(lane.id);
    const previous = i ? laneGeometry.get(laneList[i - 1].id) : undefined;
    const top = prior?.position.y ?? Math.max(lane.position.y, previous ? previous.top + previous.height + LANE_GAP : lane.position.y);
    const width = Math.max(Number(lane.style?.width ?? 0), Number(prior?.style?.width ?? 0));
    let height = Math.max(Number(lane.style?.height ?? 0), Number(prior?.style?.height ?? 0));
    const next = laneList[i + 1];
    const nextPrior = next && kept.get(next.id);
    if (nextPrior) {
      const nextTop = nextPrior.position.y;
      height = Math.min(height, Math.max(0, nextTop - top - LANE_GAP));
    }
    laneGeometry.set(lane.id, { top, height, width });
  }
  const placed = new Map();
  const laneWidths = new Map();
  const laneHeights = new Map();
  for (const node of currentNodes) {
    if (node.type === 'lane') continue;
    const sid = sessionIdOfNode(node.id) ?? '';
    const list = placed.get(sid) ?? [];
    list.push(node.position);
    placed.set(sid, list);
  }
  return graphNodes.map((node) => {
    const prior = kept.get(node.id);
    if (prior) {
      if (node.type === 'lane') {
        const geometry = laneGeometry.get(node.id);
        return { ...node, style: { ...node.style, width: geometry?.width, height: geometry?.height }, position: { ...node.position, y: geometry?.top ?? prior.position.y }, selected: prior.selected };
      }
      return { ...node, position: prior.position, selected: prior.selected };
    }
    const position = { ...node.position };
    if (node.type === 'lane') {
      const geometry = laneGeometry.get(node.id);
      return { ...node, style: { ...node.style, width: geometry?.width, height: geometry?.height }, position: { ...node.position, y: geometry?.top ?? node.position.y } };
    }
    const sid = sessionIdOfNode(node.id) ?? '';
    const graphLane = graphLanes.get(`lane:${sid}`);
    const geometry = laneGeometry.get(`lane:${sid}`);
    if (graphLane && geometry) position.y += geometry.top - graphLane.position.y;
    const laneNodes = placed.get(sid) ?? [];
    if (graphLane && geometry) {
      const laneTop = geometry.top;
      const laneBottom = laneTop + geometry.height;
      const baseY = position.y;
      const collides = (x, y) => laneNodes.some((p) => Math.abs(p.x - x) < 300 && Math.abs(p.y - y) < 140);
      let found = false;
      const maxRows = Math.ceil(Math.max(Math.abs(baseY - laneTop), Math.abs(baseY - laneBottom)) / 145) + 1;
      const candidateYs = [];
      for (let row = 0; row <= maxRows; row++) {
        const step = Math.ceil(row / 2) * 145 * (row % 2 === 0 ? 1 : -1);
        const y = baseY + step;
        if (y >= laneTop && y + LANE_NODE_HEIGHT <= laneBottom) candidateYs.push(y);
      }
      if (!candidateYs.length) {
        // A legacy or inconsistent lane can have less than one node of room.
        // Give the new node a finite fallback column and enough background;
        // the loop below must never run without a vertical candidate.
        candidateYs.push(laneTop);
        laneHeights.set(sid, Math.max(laneHeights.get(sid) ?? 0, LANE_NODE_HEIGHT));
      }
      const maxColumns = Math.max(1, laneNodes.length * 2 + 2);
      for (let column = 0; column < maxColumns && !found; column++) {
        const x = position.x + column * 320;
        for (const y of candidateYs) {
          if (collides(x, y)) continue;
          position.x = x; position.y = y; found = true; break;
        }
        if (x + LANE_NODE_WIDTH > geometry.width)
          laneWidths.set(sid, Math.max(laneWidths.get(sid) ?? 0, x + LANE_NODE_WIDTH + 40));
      }
      if (!found) {
        position.x = Math.max(geometry.width, ...laneNodes.map((p) => p.x + LANE_NODE_WIDTH)) + 40;
        position.y = candidateYs[0];
        laneWidths.set(sid, position.x + LANE_NODE_WIDTH + 40);
      }
    } else {
      while (laneNodes.some((p) => Math.abs(p.x - position.x) < 300 && Math.abs(p.y - position.y) < 140)) position.y += 145;
    }
    laneNodes.push(position);
    placed.set(sid, laneNodes);
    return { ...node, position };
  }).map((node) => {
    if (node.type !== 'lane') return node;
    const sid = sessionIdOfNode(node.id);
    const width = sid ? laneWidths.get(sid) : undefined;
    const height = sid ? laneHeights.get(sid) : undefined;
    return width || height ? { ...node, style: {
      ...node.style,
      ...(width ? { width: Math.max(Number(node.style?.width ?? 0), width) } : {}),
      ...(height ? { height: Math.max(Number(node.style?.height ?? 0), height) } : {}),
    } } : node;
  });
}

// Session a node ID belongs to, or null for IDs that are not per-session.
export function sessionIdOfNode(nodeId) {
  const [kind, sid] = nodeId.split(':');
  return ['session', 'dispatch', 'gate', 'observation', 'signals', 'lane'].includes(kind) && sid ? sid : null;
}

// Node a timeline event belongs to. `summarised` is true when several sessions are
// shown, so uncorrelated signals live in the per-session summary node.
export function nodeIdForEvent(session, index, summarised) {
  const event = session.observations[index];
  if (!event) return '';
  if (event.dispatchId) return `dispatch:${session.sessionId}:${event.dispatchId}`;
  if (event.type === 'gate') {
    const gateIndex = session.observations.slice(0, index).filter((o) => o.type === 'gate').length;
    return `gate:${session.sessionId}:${event.timestamp}:${gateIndex}`;
  }
  if (!isUnlinkedSignal(event)) return '';
  return summarised ? `signals:${session.sessionId}` : observationNodeId(session.sessionId, event, index);
}

// The session and record a node stands for, looked up in that node's own session.
export function resolveNode(sessions, nodeId) {
  const sid = sessionIdOfNode(nodeId);
  const session = sid ? sessions.find((s) => s.sessionId === sid) : undefined;
  if (!session) return { session: undefined, item: null };
  const parts = nodeId.split(':');
  let item = null;
  if (parts[0] === 'dispatch') {
    const key = parts.slice(2).join(':');
    item = session.dispatches.find((d) => d.executionId === key) ?? null;
  } else if (parts[0] === 'gate') {
    const gates = session.observations.filter((o) => o.type === 'gate');
    const time = Number(parts.at(-2));
    const byIndex = gates[Number(parts.at(-1))];
    item = byIndex && byIndex.timestamp === time ? byIndex : gates.find((o) => o.timestamp === time) ?? null;
  } else if (parts[0] === 'observation') {
    item = session.observations[Number(parts.at(-1))] ?? null;
  } else if (parts[0] === 'signals') {
    item = session.observations.filter(isUnlinkedSignal).at(-1) ?? null;
  } else if (parts[0] === 'session') {
    item = session.observations.at(-1) ?? null;
  }
  return { session, item };
}

// Selection: `recent` follows the snapshot's recent-activity sessions; `manual`
// is the user's own set.
export const recentSelection = () => ({ mode: 'recent' });

const byRecency = (a, b) => b.lastObservedAt - a.lastObservedAt || a.sessionId.localeCompare(b.sessionId);

export function shownSessionIds(selection, sessions, recent) {
  const known = new Set(sessions.map((s) => s.sessionId));
  if (selection.mode === 'manual') {
    const chosen = new Set(selection.ids);
    return sessions.filter((s) => chosen.has(s.sessionId)).sort(byRecency).map((s) => s.sessionId);
  }
  const ids = (recent?.sessions ?? []).map((s) => s.sessionId).filter((id) => known.has(id));
  if (ids.length) return ids;
  return sessions.length ? [[...sessions].sort(byRecency)[0].sessionId] : [];
}

// The first toggle copies the derived set into a manual selection, then applies.
export function toggleSelection(selection, id, derivedIds) {
  const base = selection.mode === 'manual' ? selection.ids : derivedIds;
  return { mode: 'manual', ids: base.includes(id) ? base.filter((x) => x !== id) : [...base, id] };
}
export const addSelection = (selection, id, derivedIds) => {
  const base = selection.mode === 'manual' ? selection.ids : derivedIds;
  return { mode: 'manual', ids: base.includes(id) ? base : [...base, id] };
};
export const showAllRecent = () => ({ mode: 'recent' });

// A poll only drops manual IDs that no longer exist; it returns the same object
// when nothing was dropped.
export function pruneSelection(selection, sessions) {
  if (selection.mode !== 'manual') return selection;
  const known = new Set(sessions.map((s) => s.sessionId));
  const ids = selection.ids.filter((id) => known.has(id));
  return ids.length === selection.ids.length ? selection : { mode: 'manual', ids };
}

// Lanes keep their order while the set is unchanged: sessions already laid out keep
// their place and new ones go last, so a kept lane never moves under its nodes.
export const stableLaneOrder = (previous, shown) => [
  ...previous.filter((id) => shown.includes(id)),
  ...shown.filter((id) => !previous.includes(id)),
];

const sameValue = (a, b) => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => sameValue(a[k], b[k]));
};

// A poll rebuilds the snapshot, but only `generatedAt` moves when nothing was
// observed. Parts that are equal to the previous ones keep their identity, so
// everything memoised on them is skipped.
export function stabilizeSnapshot(previous, next) {
  const out = { ...next };
  for (const key of Object.keys(next)) {
    if (key !== 'generatedAt' && key in previous && sameValue(previous[key], next[key])) out[key] = previous[key];
  }
  return out;
}

// Items of `next` that equal their counterpart in `previous` (same id, every field
// of the new item equal; extra fields React Flow added, such as `measured`, are
// ignored) are replaced by that previous object, so React skips them. Returns
// `previous` itself when nothing changed, which makes a state update a no-op.
export function reuseUnchanged(next, previous) {
  const before = new Map(previous.map((item) => [item.id, item]));
  let same = next.length === previous.length;
  const result = next.map((item, i) => {
    const old = before.get(item.id);
    const equal = old && Object.keys(item).every((k) => sameValue(item[k], old[k]));
    if (!equal || previous[i] !== old) same = false;
    return equal ? old : item;
  });
  return same ? previous : result;
}

// Marks only `id` as selected. Nodes whose selection does not change keep their
// identity, so a click re-renders two nodes instead of all of them.
export function selectOnly(nodes, id) {
  let changed = false;
  const result = nodes.map((node) => {
    if (!!node.selected === (node.id === id)) return node;
    changed = true;
    return { ...node, selected: node.id === id };
  });
  return changed ? result : nodes;
}

export function summariseSession(session) {
  return {
    sessionId: session.sessionId, runtime: session.runtime, projectId: session.projectId, branch: session.branch,
    lastObservedAt: session.lastObservedAt, lastObservedType: session.observations.at(-1)?.type ?? 'unknown',
    workingAgents: session.dispatches.filter((d) => d.executionState === 'active').map((d) => ({ executionId: d.executionId, agent: d.agent })),
    unendedDispatches: session.dispatches.filter((d) => d.endedAt == null && d.executionState !== 'active').length,
  };
}

// Cards for the panel: every recent session, then shown sessions outside the window.
export function panelEntries(sessions, recent, shownIds) {
  const entries = (recent?.sessions ?? []).map((s) => ({ session: s, outsideWindow: false, shown: shownIds.includes(s.sessionId) }));
  const listed = new Set(entries.map((e) => e.session.sessionId));
  for (const id of shownIds) {
    const session = sessions.find((s) => s.sessionId === id);
    if (session && !listed.has(id)) entries.push({ session: summariseSession(session), outsideWindow: true, shown: true });
  }
  return entries;
}

// Events of all given sessions in time order (ties by session, then index), each
// labelled with its session. Filters accept 'all' like the UI selects do.
export function mergedTimeline(sessions, { type = 'all', agent = 'all' } = {}) {
  const rows = [];
  for (const session of sessions) {
    session.observations.forEach((event, index) => {
      if ((type === 'all' || event.type === type) && (agent === 'all' || event.data.agent === agent))
        rows.push({ sessionId: session.sessionId, index, event });
    });
  }
  return rows.sort((a, b) => a.event.timestamp - b.event.timestamp || a.sessionId.localeCompare(b.sessionId) || a.index - b.index);
}

export const timelineAgents = (sessions) => [...new Set(sessions.flatMap((s) => s.observations)
  .map((e) => typeof e.data.agent === 'string' ? e.data.agent : '').filter(Boolean))];
