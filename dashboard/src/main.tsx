import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Background, Controls, Handle, MiniMap, Position, ReactFlow,
  type Edge, type NodeProps, type OnEdgesChange, type OnNodesChange, type ReactFlowInstance,
  useEdgesState, useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './style.css';
import {
  addSelection, fmtDate, graphFor, human, mergedTimeline, nodeIdForEvent, panelEntries, preserveGraphNodes, pruneSelection, recentSelection,
  resolveNode, reuseUnchanged, selectOnly, shownSessionIds, short, showAllRecent, stabilizeSnapshot, stableLaneOrder, timelineAgents, toggleSelection,
  type Dispatch, type GraphNode, type GraphView, type Observation, type RecentActivity, type Selection, type Session, type TimelineRow,
} from './graph-model.js';

type AgentPresence = { agentId: string; sessionId: string; executionId: string; runtime: string; activity: 'working' | 'waiting' | 'blocked' | 'finished' | 'unknown'; updatedAt: number | null; observedActivity: string | null };
type Snapshot = { schemaVersion: number; generatedAt: number; sessions: Session[]; agents: AgentPresence[]; observations: Observation[]; recentActivity?: RecentActivity };

const initial: Snapshot = { schemaVersion: 1, generatedAt: 0, sessions: [], agents: [], observations: [] };
const fmtTime = (ts?: number | null) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// Programmatic camera moves and scrolling honour the reduced-motion preference;
// the stylesheet only covers CSS transitions and animations.
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motion = (ms: number) => reducedMotion() ? 0 : ms;
// Ages are measured from the snapshot's own clock, so they freeze with the last
// snapshot when the connection drops instead of growing as if re-checked.
const ago = (from: number, to: number, suffix = 'ago') => {
  const s = Math.max(0, Math.floor((to - from) / 1000));
  return `${s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h`} ${suffix}`;
};

const StudioNode = React.memo(function StudioNode({ data, selected }: NodeProps<GraphNode>) {
  const icon = data.kind === 'session' ? '◉' : data.kind === 'gate' ? '⚑' : data.kind === 'decision' ? '⌘' : data.kind === 'reference' ? '↳' : '◇';
  return <div className={`flow-card ${data.kind} state-${data.state} ${selected ? 'selected' : ''}`} title={data.context}>
    <Handle type="target" position={Position.Left} />
    <div className="flow-top"><span className="flow-icon" aria-hidden="true">{icon}</span><span className="flow-kind">{data.kind}</span><span className="state-pill">{human(data.state)}</span></div>
    <strong>{data.title}</strong><span className="flow-subtitle">{data.subtitle}</span>
    {data.source && <span className="flow-source">{data.source}</span>}
    <Handle type="source" position={Position.Right} />
  </div>;
});
// A lane is only a background: it groups one session's nodes and implies no relation.
const LaneNode = React.memo(function LaneNode({ data }: NodeProps<GraphNode>) {
  return <div className="lane-bg" aria-hidden="true"><span className="lane-label">{data.title}</span></div>;
});
const nodeTypes = { studio: StudioNode, lane: LaneNode };
// Module-level so the memoised canvas below gets the same props on every render.
const fitViewOptions = { padding: 0.22 };
const ariaLabelConfig = { 'node.a11yDescription.default': 'Press Enter or Space to show this node in the details panel. Arrow keys move the selected node within the layout.' };
const miniMapColor = (node: GraphNode) => node.type === 'studio' ? '#49637b' : '#1b2631';

type CanvasProps = {
  nodes: GraphNode[]; edges: Edge[]; onNodesChange: OnNodesChange<GraphNode>; onEdgesChange: OnEdgesChange<Edge>;
  onNodeClick: (event: React.MouseEvent, node: GraphNode) => void; onKeyDown: (event: React.KeyboardEvent) => void;
  onInit: (instance: ReactFlowInstance<GraphNode, Edge>) => void;
};
// Memoised: a poll that changes nothing re-renders App (the "Updated" clock) but not the graph.
const Canvas = React.memo(function Canvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onKeyDown, onInit }: CanvasProps) {
  return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} onKeyDown={onKeyDown} onInit={onInit} fitView fitViewOptions={fitViewOptions} minZoom={0.2} maxZoom={1.6}
    deleteKeyCode={null} edgesFocusable={false} ariaLabelConfig={ariaLabelConfig}>
    <Background color="#26313d" gap={24} size={1} /><MiniMap nodeColor={miniMapColor} maskColor="rgba(8,12,18,.7)" /><Controls showInteractive={false} />
  </ReactFlow>;
});

type TimelineListProps = { rows: TimelineRow[]; onSelect: (row: TimelineRow) => void };
const TimelineButton = React.memo(function TimelineButton({ row, onSelect }: { row: TimelineRow; onSelect: (row: TimelineRow) => void }) {
  const e = row.event;
  return <button className="timeline-row" onClick={() => onSelect(row)}>
    <time>{fmtTime(e.timestamp)}</time><span className={`event-mark mark-${e.type === 'gate' ? 'gate' : e.type.includes('end') || e.type.includes('stop') ? 'done' : 'agent'}`}>{e.type === 'gate' ? '⚑' : e.type.includes('end') || e.type.includes('stop') ? '✓' : '◇'}</span><span className="timeline-main"><span className="timeline-session" title={row.sessionId}>{short(row.sessionId, 8)}</span><strong>{human(e.type)}</strong><span>{typeof e.data.agent === 'string' ? human(e.data.agent) : e.dispatchId ? `Dispatch ${short(e.dispatchId)}` : e.data.kind ? human(String(e.data.kind)) : 'Runtime event'}</span></span><span className="timeline-source">{e.source} · {e.confidence}</span><span className="row-arrow">↗</span>
  </button>;
}, (a, b) => a.onSelect === b.onSelect && a.row.event === b.row.event && a.row.sessionId === b.row.sessionId && a.row.index === b.row.index);
// Up to 300 rows per session: a click or poll must not re-render rows that did not change.
const TimelineList = React.memo(function TimelineList({ rows, onSelect }: TimelineListProps) {
  return <div className="timeline-list">{rows.map((row) => <TimelineButton key={`${row.sessionId}-${row.index}`} row={row} onSelect={onSelect} />)}</div>;
});

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [selection, setSelection] = useState<Selection>(recentSelection);
  const [connected, setConnected] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  const [selected, setSelected] = useState<Observation | Dispatch | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [graphView, setGraphView] = useState<GraphView>('observed');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<GraphNode, Edge> | null>(null);
  const laneOrder = useRef<string[]>([]);
  // `sessions` and `recentActivity` keep their identity across a poll that changed
  // nothing (stabilizeSnapshot), so everything derived from them is skipped.
  const { sessions, recentActivity } = snapshot;
  const derivedIds = useMemo(() => shownSessionIds(selection, sessions, recentActivity), [selection, sessions, recentActivity]);
  // A new array on every poll would defeat the memos below; keep the old one while the IDs match.
  const shownIdsRef = useRef<string[]>([]);
  if (shownIdsRef.current.length !== derivedIds.length || shownIdsRef.current.some((id, i) => id !== derivedIds[i])) shownIdsRef.current = derivedIds;
  const shownIds = shownIdsRef.current;
  const shownSessions = useMemo(() => {
    laneOrder.current = stableLaneOrder(laneOrder.current, shownIds);
    return laneOrder.current.flatMap((id) => sessions.find((s) => s.sessionId === id) ?? []);
  }, [shownIds, sessions]);
  const multi = shownSessions.length > 1;
  const graph = useMemo(() => graphFor(shownSessions, graphView), [shownSessions, graphView]);
  const graphSignature = useMemo(() => JSON.stringify([graph.nodes.map((n) => [n.id, n.data]), graph.edges]), [graph]);
  const dispatchTotal = shownSessions.reduce((sum, s) => sum + s.dispatches.length, 0);
  const gateTotal = shownSessions.reduce((sum, s) => sum + s.observations.filter((e) => e.type === 'gate').length, 0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const response = await fetch('/execution.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as Snapshot;
        if (!alive) return;
        setSnapshot((previous) => stabilizeSnapshot(previous, data)); setConnected(true); setUpdated(Date.now());
        setSelection((current) => pruneSelection(current, data.sessions));
      } catch { if (alive) setConnected(false); }
    };
    void refresh(); const timer = window.setInterval(refresh, 2000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    // Unchanged nodes and edges keep their identity, so only what differs re-renders.
    setNodes((current) => reuseUnchanged(preserveGraphNodes(graph.nodes, current), current));
    setEdges((current) => reuseUnchanged(graph.edges, current));
  }, [graphSignature, setNodes, setEdges]);
  useEffect(() => {
    if (!focusNodeId || !flow) return;
    const target = nodes.find((node) => node.id === focusNodeId);
    if (!target) return; // A new observation may render before React Flow has its node store updated.
    setNodes((current) => selectOnly(current, focusNodeId));
    void flow.fitView({ nodes: [target], duration: motion(260), padding: 0.55 });
    setFocusNodeId(null);
  }, [focusNodeId, nodes, flow, setNodes]);
  // Only the user's own choices clear the inspector; a poll leaves `selection` as it was.
  useEffect(() => { setSelectedGraphNode(null); setSelected(null); setSelectedSessionId(null); }, [graphView, selection]);

  const inspectNode = useCallback((node: GraphNode) => {
    const { session, item } = resolveNode(sessions, node.id);
    setSelected(item);
    setSelectedSessionId(session?.sessionId ?? null);
    setSelectedGraphNode(node);
    setNodes((current) => selectOnly(current, node.id));
  }, [sessions, setNodes]);
  const onNodeClick = useCallback((_event: React.MouseEvent, node: GraphNode) => inspectNode(node), [inspectNode]);
  // React Flow selects a focused node on Enter/Space but only reports mouse clicks,
  // so keyboard users would otherwise never reach the inspector.
  const onGraphKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const id = (event.target as HTMLElement).closest?.('.react-flow__node')?.getAttribute('data-id');
    const node = id ? nodes.find((n) => n.id === id) : undefined;
    if (node) inspectNode(node);
  }, [nodes, inspectNode]);
  // Dispatch details follow the latest snapshot, so an open inspector does not
  // keep showing a superseded state or measurement.
  const inspected = selected && !('type' in selected)
    ? sessions.find((s) => s.sessionId === selectedSessionId)?.dispatches.find((d) => d.executionId === selected.executionId) ?? selected
    : selected;

  const agents = useMemo(() => timelineAgents(shownSessions), [shownSessions]);
  const timeline = useMemo(() => mergedTimeline(shownSessions, { type: filter, agent: agentFilter }).reverse(), [shownSessions, filter, agentFilter]);
  const selectObservation = useCallback((row: TimelineRow) => {
    setSelected(row.event);
    setSelectedSessionId(row.sessionId);
    setSelectedGraphNode(null);
    const session = shownSessions.find((s) => s.sessionId === row.sessionId);
    const id = session ? nodeIdForEvent(session, row.index, multi) : '';
    if (id) {
      if (graphView === 'reference') setGraphView('observed');
      setFocusNodeId(id);
    }
  }, [shownSessions, multi, graphView]);
  const addable = sessions.filter((s) => !shownIds.includes(s.sessionId));
  const only = shownSessions.length === 1 ? shownSessions[0] : undefined;

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-mark">C</span><span>canonkit<span className="brand-muted"> / observatory</span></span></a>
      <div className="header-context">{multi
        ? <strong>{shownSessions.length} sessions</strong>
        : <><span className="context-label">PROJECT</span><strong>{only?.projectId ?? 'Project not identified'}</strong><span className="context-sep">/</span><span className="context-label">BRANCH</span><span>{only?.branch ?? 'Unavailable from runtime hooks'}</span></>}</div>
      <div className="connection"><span className={`connection-dot ${connected ? 'online' : ''}`} />{connected ? 'Dashboard online' : 'Disconnected'}<span className="updated">{updated ? `Updated ${fmtTime(updated)}` : 'Waiting for observations'}</span></div>
    </header>
    <nav className="main-nav" aria-label="Dashboard views">
      <a className="nav-item" href="/activity.html">Activity overview <span className="nav-count">↗</span></a>
      <a className="nav-item active" href="/">Execution graph</a>
      <button className="nav-item" onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })}>Timeline</button>
      <span className="nav-item future" aria-disabled="true">Agent Office <small>FUTURE</small></span>
      <div className="session-picker"><label htmlFor="session-select">ADD SESSION</label><select id="session-select" value="" onChange={(e) => { const id = e.target.value; if (id) setSelection((current) => addSelection(current, id, shownIds)); }} disabled={!addable.length}>
        <option value="">{!snapshot.sessions.length ? 'No observed sessions' : addable.length ? 'Choose a session…' : 'All sessions are in the graph'}</option>
        {addable.map((s) => <option key={s.sessionId} value={s.sessionId}>{s.runtime} · {short(s.sessionId, 12)}</option>)}
      </select></div>
    </nav>
    {!connected && updated && <div className="stale-banner" role="status"><span>Connection lost.</span> Showing the last observed snapshot from {fmtDate(updated)}. The dashboard will retry automatically.</div>}
    <SessionOverview snapshot={snapshot} connected={connected} manual={selection.mode === 'manual'} shownIds={shownIds}
      onToggle={(id) => setSelection((current) => toggleSelection(current, id, shownIds))} onShowRecent={() => setSelection(showAllRecent())} />
    <section className="overview-strip">
      <div><span className="eyebrow">RUNTIME</span><strong>{shownSessions.length ? 'Claude Code' : 'Not instrumented'}</strong></div>
      <div><span className="eyebrow">OBSERVED DISPATCHES</span><strong>{dispatchTotal}</strong></div>
      <div><span className="eyebrow">WORKFLOW / APPROVAL</span><strong className="unknown-text">{shownSessions.length ? 'Unknown unless evidenced' : 'No observations'}</strong></div>
      <div className="coverage-note"><span className="coverage-icon">i</span><span>Sessions without runtime events, project identity, branch or worktree data stay undisclosed.</span></div>
    </section>
    <section className="workspace">
      <div className="canvas-column">
        <div className="section-heading"><div><span className="eyebrow">LIVE EXECUTION</span><h1>{graphView === 'observed' ? 'Observed activity graph' : 'Canonical risk routes'}</h1><p>{graphView === 'observed' ? `Dispatches and gates from ${multi ? 'the selected sessions, one lane each' : 'this session'}. Connections show session membership, not inferred workflow order${multi ? ', and nothing is inferred between sessions' : ''}.` : 'Conditional LOW, MEDIUM and HIGH paths from CanonKit guidance. No route is selected by runtime evidence.'}</p></div><div className="canvas-actions"><button onClick={() => { setNodes((current) => { const chosen = new Set(current.filter((n) => n.selected).map((n) => n.id)); return graph.nodes.map((n) => ({ ...n, selected: chosen.has(n.id) })); }); void flow?.fitView({ duration: motion(280), padding: 0.22 }); }}>Auto layout</button><button onClick={() => void flow?.fitView({ duration: motion(280), padding: 0.22 })}>Fit view</button><span className="legend"><i className="legend-dot active-dot" /> Active</span><span className="legend"><svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="#54aeb8" strokeWidth="1.5" strokeDasharray="6 4" /></svg> Active dispatch</span><span className="legend"><i className="legend-dot done-dot" /> End observed</span><span className="legend"><i className="legend-dot unknown-dot" /> Unknown</span></div></div>
        <div className="graph-tabs" role="group" aria-label="Graph view"><button className={graphView === 'observed' ? 'chosen' : ''} aria-pressed={graphView === 'observed'} onClick={() => setGraphView('observed')}>Observed execution</button><button className={graphView === 'reference' ? 'chosen' : ''} aria-pressed={graphView === 'reference'} onClick={() => setGraphView('reference')}>LOW / MEDIUM / HIGH routes</button></div>
        <div className="graph-frame">
          {graph.nodes.length ? <Canvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} onKeyDown={onGraphKeyDown} onInit={setFlow} /> : graphView === 'observed' && snapshot.sessions.length ? <div className="empty-graph"><div className="empty-symbol">◎</div><h2>No session is selected</h2><p>Press a session card above, or use Add session, to show it here. “Show all recent” returns to the sessions with recent activity.</p></div>
            : <div className="empty-graph"><div className="empty-symbol">◎</div><h2>No execution events observed</h2><p>The dashboard reads existing local CanonKit hook records. It does not start an agent or create a session to collect activity.</p><a href="/activity.html">Open Activity overview <span>↗</span></a></div>}
          <div className="canvas-foot"><span>SESSION MEMBERSHIP</span><span>{shownSessions.length ? `${plural(dispatchTotal, 'dispatch', 'dispatches')} · ${plural(gateTotal, 'gate', 'gates')}` : 'Waiting for telemetry'}</span></div>
        </div>
      </div>
      <aside className="detail-panel" aria-label="Selected observation details">
        <div className="panel-heading"><div><span className="eyebrow">INSPECTOR</span><h2>{selected ? 'Observation details' : multi ? 'Shown sessions' : 'Session details'}</h2></div><span className="panel-menu">···</span></div>
        {selectedGraphNode?.data.kind === 'reference' || selectedGraphNode?.data.kind === 'decision' ? <ReferenceDetail node={selectedGraphNode} /> : inspected ? <Detail item={inspected} sessionId={multi ? selectedSessionId ?? undefined : undefined} /> : only ? <>
          <div className="detail-hero"><span className="hero-icon">◉</span><div><strong>Runtime session</strong><span>Claude Code · observed</span></div></div>
          <DetailRow label="Session ID" value={only.sessionId} mono />
          <DetailRow label="Project identity" value="Unknown · basename is not a stable ID" />
          <DetailRow label="Worktree / branch" value="Not instrumented" />
          <DetailRow label="Workflow status" value="Unknown · no milestone source" />
          <DetailRow label="Approval status" value="Unknown · no approval event" />
          <div className="panel-callout"><strong>Evidence quality</strong><span>Runtime hook events · observed</span><p>Presence and end events describe execution. They do not confirm task success or review approval.</p></div>
        </> : multi ? <>
          <div className="detail-hero"><span className="hero-icon">◉</span><div><strong>{shownSessions.length} sessions in the graph</strong><span>One lane each · nothing inferred between sessions</span></div></div>
          {shownSessions.map((s) => <DetailRow key={s.sessionId} label={plural(s.dispatches.length, 'dispatch', 'dispatches')} value={s.sessionId} mono />)}
          <div className="panel-callout"><strong>Evidence quality</strong><span>Runtime hook events · observed</span><p>Select a node or a timeline event to inspect it.</p></div>
        </> : <div className="empty-inspector"><span>◇</span><p>Select an observed node to inspect its evidence and state.</p></div>}
      </aside>
    </section>
    <section className="timeline-section" id="timeline">
      <div className="timeline-header"><div><span className="eyebrow">SESSION HISTORY</span><h2>Timeline</h2></div><div className="filters"><label><span>TYPE</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All events</option>{['prompt', 'agent_start', 'agent_launch', 'agent_end', 'agent_stop', 'agent_resume', 'gate'].map((v) => <option key={v} value={v}>{human(v)}</option>)}</select></label><label><span>AGENT</span><select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}><option value="all">All agents</option>{agents.map((a) => <option key={a} value={a}>{human(a)}</option>)}</select></label></div></div>
      {timeline.length ? <TimelineList rows={timeline} onSelect={selectObservation} /> : <div className="timeline-empty">{shownSessions.length ? 'No events match these sessions and filter.' : 'No session is selected.'}</div>}
      <div className="retention-note">Showing {timeline.length} normalized observations available in retained logs (latest 300 per session). Older or rotated events may no longer be present.</div>
    </section>
    <footer><span>CANONKIT OBSERVATORY <i>·</i> LOCAL TELEMETRY</span><span>Workflow and approval state require direct evidence.</span></footer>
  </main>;
}

function SessionOverview({ snapshot, connected, manual, shownIds, onToggle, onShowRecent }: {
  snapshot: Snapshot; connected: boolean; manual: boolean; shownIds: string[]; onToggle: (id: string) => void; onShowRecent: () => void;
}) {
  const recent = snapshot.recentActivity;
  // Nothing to say before the first snapshot or when the server predates this field.
  if (!recent || !snapshot.generatedAt) return null;
  const minutes = Math.round(recent.windowMs / 60000);
  const entries = panelEntries(snapshot.sessions, recent, shownIds);
  return <section className="session-overview" aria-labelledby="session-overview-title">
    <div className="session-overview-head"><h2 id="session-overview-title">Recent sessions</h2><span>{plural(recent.sessions.length, 'session', 'sessions')}</span><span>Recent activity · last {minutes} min{!connected && ` · as of ${fmtDate(snapshot.generatedAt)}`}</span>{manual && <button type="button" className="session-showall" onClick={onShowRecent}>Show all recent</button>}</div>
    {!recent.sessions.length && <p className="session-empty">{snapshot.sessions.length === 0 ? 'No sessions observed yet.' : <>No session had activity in the last {minutes} minutes. Older sessions can be added with Add session.</>}</p>}
    {entries.length > 0 && <div className="session-cards">{entries.map(({ session: s, outsideWindow, shown }) => {
      const names = s.workingAgents.map((a) => a.agent ? human(a.agent) : 'Unidentified agent');
      return <button key={s.sessionId} type="button" className={`session-card ${shown ? 'open' : ''}`} aria-pressed={shown} title={s.sessionId} onClick={() => onToggle(s.sessionId)}>
        <span className="session-card-top"><strong>{short(s.sessionId, 12)}</strong>{shown && <span className="session-open-mark">▸ In graph</span>}</span>
        {outsideWindow && <span className="session-outside">Outside {minutes}-min window</span>}
        <span className="session-card-meta">Project: {s.projectId ?? 'not identified'} · Branch: {s.branch ?? 'unavailable'}</span>
        <span>{names.length ? `Agents with an open dispatch: ${names.join(', ')}` : 'No agent with an open dispatch'}</span>
        <span>Dispatches with no end seen: {s.unendedDispatches}</span>
        <span>Last event: {human(s.lastObservedType)} · {ago(s.lastObservedAt, snapshot.generatedAt, connected ? 'ago' : 'before last update')}</span>
      </button>;
    })}</div>}
  </section>;
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? 'mono' : ''}>{value}</strong></div>;
}
function Detail({ item, sessionId }: { item: Observation | Dispatch; sessionId?: string }) {
  const session = sessionId ? <DetailRow label="Session" value={sessionId} mono /> : null;
  if ('type' in item) return <>
    <div className="detail-hero"><span className="hero-icon">{item.type === 'gate' ? '⚑' : '◇'}</span><div><strong>{human(item.type)}</strong><span>{item.source} · {item.confidence}</span></div></div>
    {session}
    <DetailRow label="Observed at" value={fmtDate(item.timestamp)} />
    <DetailRow label="Runtime" value={human(item.runtime)} />
    {item.dispatchId && <DetailRow label="Dispatch ID" value={item.dispatchId} mono />}
    {item.agentId && <DetailRow label="Agent ID" value={item.agentId} mono />}
    {typeof item.data.agent === 'string' && <DetailRow label="Agent" value={human(item.data.agent)} />}
    {typeof item.data.kind === 'string' && <DetailRow label="Gate kind" value={human(item.data.kind)} />}
    {typeof item.data.decision === 'string' && <DetailRow label="Gate decision" value={human(item.data.decision)} />}
    <DetailRow label="Execution state" value="Observed event only" />
    <DetailRow label="Workflow / approval" value="Unknown unless confirmed by an explicit source" />
  </>;
  return <>
    <div className="detail-hero"><span className="hero-icon">◇</span><div><strong>{item.agent ? human(item.agent) : 'Agent dispatch'}</strong><span>{human(item.executionState)} · runtime event</span></div></div>
    {session}
    <DetailRow label="Dispatch ID" value={item.executionId} mono />
    <DetailRow label="Agent ID" value={item.agentId ?? 'Unavailable'} mono />
    <DetailRow label="Started" value={fmtDate(item.startedAt)} />
    <DetailRow label="Ended" value={fmtDate(item.endedAt)} />
    <DetailRow label="Lifecycle evidence" value={item.evidence.map(human).join(' · ') || 'None observed'} />
    <DetailRow label="Duration" value={item.durationMs == null ? 'Not measured' : `${(item.durationMs / 1000).toFixed(1)} s`} />
    <DetailRow label="Workflow state" value={human(item.workflowState)} />
    <DetailRow label="Approval state" value={human(item.approvalState)} />
    <DetailRow label="Telemetry" value={human(item.telemetryState)} />
    {item.tokens && <div className="token-box"><span>Measured tokens</span><strong>{item.tokens.total?.toLocaleString() ?? 'Partial data'}</strong><small>Transcript-derived · does not indicate quality or cost</small></div>}
    <div className="panel-callout"><strong>Evidence quality</strong><span>Dispatch lifecycle · observed</span><p>An end event confirms that the runtime stopped this dispatch. It does not establish successful work or approved review.</p></div>
  </>;
}

function ReferenceDetail({ node }: { node: GraphNode }) {
  return <>
    <div className="detail-hero"><span className="hero-icon">{node.data.kind === 'decision' ? '⌘' : '↳'}</span><div><strong>{node.data.title}</strong><span>Conditional workflow guidance</span></div></div>
    <DetailRow label="Path" value={node.data.subtitle} />
    <DetailRow label="Current status" value="Unknown · no session evidence" />
    <DetailRow label="Source" value="CanonKit risk and review guidance" />
    <DetailRow label="Selection" value="No LOW, MEDIUM or HIGH classification was observed." />
    <div className="panel-callout"><strong>Reference path only</strong><span>Not a runtime record</span><p>This route describes what CanonKit guidance calls for under this risk level. It does not indicate that this session followed or completed the route.</p></div>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
