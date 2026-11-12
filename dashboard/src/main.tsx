import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Background, Controls, Handle, MiniMap, Position, ReactFlow,
  type Edge, type Node, type NodeProps, type ReactFlowInstance,
  useEdgesState, useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './style.css';

type Observation = {
  schemaVersion: number; timestamp: number; runtime: string; source: string; confidence: string;
  sessionId: string | null; eventId: string | null; dispatchId: string | null; agentId: string | null;
  type: string; data: Record<string, unknown>;
};
type Dispatch = {
  executionId: string; agentId: string | null; agent: string | null; startedAt: number | null;
  endedAt: number | null; executionState: string; workflowState: string; approvalState: string;
  telemetryState: string; evidence: string[]; parallel: boolean; durationMs: number | null; tokens: Record<string, number> | null;
};
type Session = {
  sessionId: string; runtime: string; projectId: string | null; worktreeId: string | null;
  branch: string | null; telemetry: string; dispatches: Dispatch[]; observations: Observation[];
};
type AgentPresence = { agentId: string; sessionId: string; executionId: string; runtime: string; activity: 'working' | 'waiting' | 'blocked' | 'finished' | 'unknown'; updatedAt: number | null; observedActivity: string | null };
type Snapshot = { schemaVersion: number; generatedAt: number; sessions: Session[]; agents: AgentPresence[]; observations: Observation[] };
type GraphNode = Node<{ title: string; subtitle: string; state: string; kind: string; source?: string; context?: string }>;

const initial: Snapshot = { schemaVersion: 1, generatedAt: 0, sessions: [], agents: [], observations: [] };
const fmtTime = (ts?: number | null) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
const fmtDate = (ts?: number | null) => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const short = (s: string, n = 8) => s.length > n ? `${s.slice(0, n)}…` : s;
const human = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());

function StudioNode({ data, selected }: NodeProps<GraphNode>) {
  const icon = data.kind === 'session' ? '◉' : data.kind === 'gate' ? '⚑' : data.kind === 'decision' ? '⌘' : data.kind === 'reference' ? '↳' : '◇';
  return <div className={`flow-card ${data.kind} state-${data.state} ${selected ? 'selected' : ''}`} title={data.context}>
    <Handle type="target" position={Position.Left} />
    <div className="flow-top"><span className="flow-icon" aria-hidden="true">{icon}</span><span className="flow-kind">{data.kind}</span><span className="state-pill">{human(data.state)}</span></div>
    <strong>{data.title}</strong><span className="flow-subtitle">{data.subtitle}</span>
    {data.source && <span className="flow-source">{data.source}</span>}
    <Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { studio: StudioNode };

function graphFor(session: Session | undefined, view: 'observed' | 'reference'): { nodes: GraphNode[]; edges: Edge[] } {
  if (view === 'reference') {
    const reference = referenceGraph();
    return arrangeGraph(reference.nodes, reference.edges);
  }
  if (!session) return { nodes: [], edges: [] };
  const dispatches = session.dispatches;
  const gates = session.observations.filter((e) => e.type === 'gate');
  const width = 280;
  const nodes: GraphNode[] = [{
    id: `session:${session.sessionId}`, type: 'studio', position: { x: 50, y: Math.max(40, (Math.max(dispatches.length, gates.length, 1) - 1) * 105) },
    data: { title: `Session ${short(session.sessionId, 12)}`, subtitle: 'Observed runtime session', state: 'observed', kind: 'session', source: 'Claude Code hook' },
  }];
  const edges: Edge[] = [];
  dispatches.forEach((d, i) => {
    const id = `dispatch:${session.sessionId}:${d.executionId}`;
    const when = d.startedAt ? fmtDate(d.startedAt) : 'Start not observed';
    nodes.push({ id, type: 'studio', position: { x: 410, y: 40 + i * 150 }, data: {
      title: d.agent ? human(d.agent) : `Dispatch ${short(d.executionId)}`,
      subtitle: `${when} · ${short(d.executionId)}${d.parallel ? ' · overlapping dispatch' : ''}`,
      state: d.executionState, kind: 'dispatch', source: d.evidence.map(human).join(' / '),
    } });
    edges.push({ id: `session-dispatch-${i}`, source: `session:${session.sessionId}`, target: id, type: 'smoothstep', animated: d.executionState === 'active', label: 'dispatch' });
  });
  gates.forEach((g, i) => {
    const id = `gate:${session.sessionId}:${g.timestamp}:${i}`;
    const kind = typeof g.data.kind === 'string' ? g.data.kind : 'gate';
    const state = g.data.decision === 'blocked' ? 'blocked' : g.data.decision === 'allowed' ? 'completed' : 'unknown';
    nodes.push({ id, type: 'studio', position: { x: 410 + width, y: 40 + i * 130 }, data: {
      title: human(kind), subtitle: `${fmtDate(g.timestamp)} · ${human(String(g.data.decision || 'unknown'))}`,
      state, kind: 'gate', source: 'CanonKit hook',
    } });
    edges.push({ id: `session-gate-${i}`, source: `session:${session.sessionId}`, target: id, type: 'smoothstep', label: 'gate observed' });
  });
  session.observations.forEach((event, index) => {
    const unlinkedRuntimeSignal = ['prompt', 'agent_resume', 'agent_stop'].includes(event.type) ||
      (['agent_start', 'agent_launch', 'agent_end'].includes(event.type) && !event.dispatchId);
    if (!unlinkedRuntimeSignal || event.dispatchId) return;
    const id = observationNodeId(session.sessionId, event, index);
    nodes.push({ id, type: 'studio', position: { x: 410 + width * 2, y: 40 + index * 110 }, data: {
      title: human(event.type), subtitle: `${fmtDate(event.timestamp)} · no dispatch link observed`,
      state: 'unknown', kind: 'observation', source: 'Runtime signal · uncorrelated',
    } });
    edges.push({ id: `session-signal-${index}`, source: `session:${session.sessionId}`, target: id, type: 'smoothstep', label: 'session membership' });
  });
  return arrangeGraph(nodes, edges);
}

const observationNodeId = (sessionId: string, event: Observation, index: number) => `observation:${sessionId}:${event.timestamp}:${event.type}:${index}`;

function arrangeGraph(nodes: GraphNode[], edges: Edge[]): { nodes: GraphNode[]; edges: Edge[] } {
  const depth = new Map<string, number>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const next = outgoing.get(edge.source) ?? []; next.push(edge.target); outgoing.set(edge.source, next);
  }
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id).sort();
  for (const id of queue) depth.set(id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const target of outgoing.get(id) ?? []) {
      depth.set(target, Math.max(depth.get(target) ?? 0, (depth.get(id) ?? 0) + 1));
      const degree = (incoming.get(target) ?? 1) - 1; incoming.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }
  // Cycles are not expected in this observational graph, but remain visible in
  // the deterministic fallback column instead of being discarded.
  const maxDepth = Math.max(0, ...depth.values());
  const columns = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const level = depth.get(node.id) ?? maxDepth + 1;
    const list = columns.get(level) ?? []; list.push(node); columns.set(level, list);
  }
  const tallest = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const positioned = new Map<string, { x: number; y: number }>();
  for (const [level, column] of columns) {
    column.sort((a, b) => a.id.localeCompare(b.id));
    const offset = (tallest - column.length) * 72;
    column.forEach((node, index) => positioned.set(node.id, { x: 40 + level * 320, y: 32 + offset + index * 145 }));
  }
  return { nodes: nodes.map((node) => ({ ...node, position: positioned.get(node.id)! })), edges };
}

function referenceGraph(): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = [{
    id: 'reference:request', type: 'studio', position: { x: 20, y: 235 },
    data: { title: 'Request', subtitle: 'Reference entry point', state: 'unknown', kind: 'reference', source: 'CanonKit guidance' },
  }, {
    id: 'reference:risk', type: 'studio', position: { x: 300, y: 235 },
    data: { title: 'Classify risk', subtitle: 'No classification observed', state: 'unknown', kind: 'decision', source: 'CanonKit guidance' },
  }];
  const edges: Edge[] = [{ id: 'reference-request-risk', source: 'reference:request', target: 'reference:risk', type: 'smoothstep', label: 'request' }];
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

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [sessionId, setSessionId] = useState('');
  const [connected, setConnected] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  const [selected, setSelected] = useState<Observation | Dispatch | null>(null);
  const [filter, setFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [graphView, setGraphView] = useState<'observed' | 'reference'>('observed');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<GraphNode, Edge> | null>(null);
  const activeSession = snapshot.sessions.find((s) => s.sessionId === sessionId) ?? snapshot.sessions.at(-1);
  const graph = useMemo(() => graphFor(activeSession, graphView), [activeSession, graphView]);
  const graphSignature = JSON.stringify(graph.nodes.map((n) => [n.id, n.data]));

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const response = await fetch('/execution.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as Snapshot;
        if (!alive) return;
        setSnapshot(data); setConnected(true); setUpdated(Date.now());
        setSessionId((current) => data.sessions.some((s) => s.sessionId === current) ? current : data.sessions.at(-1)?.sessionId ?? '');
      } catch { if (alive) setConnected(false); }
    };
    void refresh(); const timer = window.setInterval(refresh, 2000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    setNodes((current) => {
      const positions = new Map(current.map((n) => [n.id, n.position]));
      return graph.nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
    });
    setEdges(graph.edges);
  }, [graphSignature, graph.edges.map((e) => e.id).join('|'), setNodes, setEdges]);
  useEffect(() => {
    if (!focusNodeId || !flow) return;
    const target = nodes.find((node) => node.id === focusNodeId);
    if (!target) return; // A new observation may render before React Flow has its node store updated.
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === focusNodeId })));
    void flow.fitView({ nodes: [target], duration: 260, padding: 0.55 });
    setFocusNodeId(null);
  }, [focusNodeId, nodes, flow, setNodes]);
  useEffect(() => { setSelectedGraphNode(null); setSelected(null); }, [graphView, sessionId]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: GraphNode) => {
    const dispatchKey = node.id.startsWith('dispatch:') ? node.id.split(':').slice(2).join(':') : '';
    const gateTime = node.id.startsWith('gate:') ? Number(node.id.split(':').at(-2)) : 0;
    const item = activeSession?.dispatches.find((d) => d.executionId === dispatchKey) ??
      activeSession?.observations.find((o) => o.type === 'gate' && o.timestamp === gateTime) ??
      (node.id.startsWith('observation:') ? activeSession?.observations[Number(node.id.split(':').at(-1))] ?? null : null);
    setSelected(item ?? (node.id.startsWith('session:') ? activeSession?.observations.at(-1) ?? null : null));
    setSelectedGraphNode(node);
    setNodes((current) => current.map((n) => ({ ...n, selected: n.id === node.id })));
  }, [activeSession]);

  const agents = [...new Set((activeSession?.observations ?? []).map((e) => typeof e.data.agent === 'string' ? e.data.agent : '').filter(Boolean))];
  const timeline = (activeSession?.observations ?? []).filter((e) => (filter === 'all' || e.type === filter) &&
    (agentFilter === 'all' || e.data.agent === agentFilter)).slice().reverse();
  const selectObservation = (e: Observation) => {
    setSelected(e);
    setSelectedGraphNode(null);
    let id = e.dispatchId ? `dispatch:${activeSession?.sessionId}:${e.dispatchId}` : '';
    if (e.type === 'gate') {
      const index = activeSession?.observations.filter((o) => o.type === 'gate').findIndex((o) => o === e) ?? -1;
      id = index >= 0 ? `gate:${activeSession?.sessionId}:${e.timestamp}:${index}` : '';
    } else if (!id && activeSession) id = observationNodeId(activeSession.sessionId, e, activeSession.observations.indexOf(e));
    if (id) {
      if (graphView === 'reference') setGraphView('observed');
      setFocusNodeId(id);
    }
  };

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-mark">C</span><span>canonkit<span className="brand-muted"> / observatory</span></span></a>
      <div className="header-context"><span className="context-label">PROJECT</span><strong>{activeSession?.projectId ?? 'Project not identified'}</strong><span className="context-sep">/</span><span className="context-label">BRANCH</span><span>{activeSession?.branch ?? 'Unavailable from runtime hooks'}</span></div>
      <div className="connection"><span className={`connection-dot ${connected ? 'online' : ''}`} />{connected ? 'Dashboard online' : 'Disconnected'}<span className="updated">{updated ? `Updated ${fmtTime(updated)}` : 'Waiting for observations'}</span></div>
    </header>
    <nav className="main-nav" aria-label="Dashboard views">
      <a className="nav-item" href="/activity.html">Activity overview <span className="nav-count">↗</span></a>
      <a className="nav-item active" href="/">Execution graph</a>
      <button className="nav-item" onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}>Timeline</button>
      <span className="nav-item future" aria-disabled="true">Agent Office <small>FUTURE</small></span>
      <div className="session-picker"><label htmlFor="session-select">SESSION</label><select id="session-select" value={activeSession?.sessionId ?? ''} onChange={(e) => setSessionId(e.target.value)} disabled={!snapshot.sessions.length}>
        {!snapshot.sessions.length && <option value="">No observed sessions</option>}
        {snapshot.sessions.map((s) => <option key={s.sessionId} value={s.sessionId}>{s.runtime} · {short(s.sessionId, 12)}</option>)}
      </select></div>
    </nav>
    {!connected && updated && <div className="stale-banner" role="status"><span>Connection lost.</span> Showing the last observed snapshot from {fmtDate(updated)}. The dashboard will retry automatically.</div>}
    <section className="overview-strip">
      <div><span className="eyebrow">RUNTIME</span><strong>{activeSession ? 'Claude Code' : 'Not instrumented'}</strong></div>
      <div><span className="eyebrow">OBSERVED DISPATCHES</span><strong>{activeSession?.dispatches.length ?? 0}</strong></div>
      <div><span className="eyebrow">WORKFLOW / APPROVAL</span><strong className="unknown-text">{activeSession ? 'Unknown unless evidenced' : 'No observations'}</strong></div>
      <div className="coverage-note"><span className="coverage-icon">i</span><span>Sessions without runtime events, project identity, branch or worktree data stay undisclosed.</span></div>
    </section>
    <section className="workspace">
      <div className="canvas-column">
        <div className="section-heading"><div><span className="eyebrow">LIVE EXECUTION</span><h1>{graphView === 'observed' ? 'Observed activity graph' : 'Canonical risk routes'}</h1><p>{graphView === 'observed' ? 'Dispatches and gates from this session. Connections show session membership, not inferred workflow order.' : 'Conditional LOW, MEDIUM and HIGH paths from CanonKit guidance. No route is selected by runtime evidence.'}</p></div><div className="canvas-actions"><button onClick={() => { setNodes(arrangeGraph(graph.nodes, graph.edges).nodes); void flow?.fitView({ duration: 280, padding: 0.22 }); }}>Auto layout</button><button onClick={() => void flow?.fitView({ duration: 280, padding: 0.22 })}>Fit view</button><span className="legend"><i className="legend-dot active-dot" /> Active</span><span className="legend"><i className="legend-dot done-dot" /> End observed</span><span className="legend"><i className="legend-dot unknown-dot" /> Unknown</span></div></div>
        <div className="graph-tabs" role="group" aria-label="Graph view"><button className={graphView === 'observed' ? 'chosen' : ''} onClick={() => setGraphView('observed')}>Observed execution</button><button className={graphView === 'reference' ? 'chosen' : ''} onClick={() => setGraphView('reference')}>LOW / MEDIUM / HIGH routes</button></div>
        <div className="graph-frame">
          {graph.nodes.length ? <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} onInit={setFlow} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.2} maxZoom={1.6}>
            <Background color="#26313d" gap={24} size={1} /><MiniMap nodeColor={(node) => node.type === 'studio' ? '#49637b' : '#23303d'} maskColor="rgba(8,12,18,.7)" /><Controls showInteractive={false} />
          </ReactFlow> : <div className="empty-graph"><div className="empty-symbol">◎</div><h2>No execution events observed</h2><p>The dashboard reads existing local CanonKit hook records. It does not start an agent or create a session to collect activity.</p><a href="/activity.html">Open Activity overview <span>↗</span></a></div>}
          <div className="canvas-foot"><span>SESSION MEMBERSHIP</span><span>{activeSession ? `${activeSession.dispatches.length} dispatches · ${activeSession.observations.filter((e) => e.type === 'gate').length} gates` : 'Waiting for telemetry'}</span></div>
        </div>
      </div>
      <aside className="detail-panel" aria-label="Selected observation details">
        <div className="panel-heading"><div><span className="eyebrow">INSPECTOR</span><h2>{selected ? 'Observation details' : 'Session details'}</h2></div><span className="panel-menu">···</span></div>
        {selectedGraphNode?.data.kind === 'reference' || selectedGraphNode?.data.kind === 'decision' ? <ReferenceDetail node={selectedGraphNode} /> : selected ? <Detail item={selected} /> : activeSession ? <>
          <div className="detail-hero"><span className="hero-icon">◉</span><div><strong>Runtime session</strong><span>Claude Code · observed</span></div></div>
          <DetailRow label="Session ID" value={activeSession.sessionId} mono />
          <DetailRow label="Project identity" value="Unknown · basename is not a stable ID" />
          <DetailRow label="Worktree / branch" value="Not instrumented" />
          <DetailRow label="Workflow status" value="Unknown · no milestone source" />
          <DetailRow label="Approval status" value="Unknown · no approval event" />
          <div className="panel-callout"><strong>Evidence quality</strong><span>Runtime hook events · observed</span><p>Presence and end events describe execution. They do not confirm task success or review approval.</p></div>
        </> : <div className="empty-inspector"><span>◇</span><p>Select an observed node to inspect its evidence and state.</p></div>}
      </aside>
    </section>
    <section className="timeline-section" id="timeline">
      <div className="timeline-header"><div><span className="eyebrow">SESSION HISTORY</span><h2>Timeline</h2></div><div className="filters"><label><span>TYPE</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All events</option>{['prompt', 'agent_start', 'agent_launch', 'agent_end', 'agent_stop', 'agent_resume', 'gate'].map((v) => <option key={v} value={v}>{human(v)}</option>)}</select></label><label><span>AGENT</span><select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}><option value="all">All agents</option>{agents.map((a) => <option key={a} value={a}>{human(a)}</option>)}</select></label></div></div>
      {timeline.length ? <div className="timeline-list">{timeline.map((e, i) => <button className="timeline-row" key={`${e.timestamp}-${e.type}-${i}`} onClick={() => selectObservation(e)}>
        <time>{fmtTime(e.timestamp)}</time><span className={`event-mark mark-${e.type === 'gate' ? 'gate' : e.type.includes('end') || e.type.includes('stop') ? 'done' : 'agent'}`}>{e.type === 'gate' ? '⚑' : e.type.includes('end') || e.type.includes('stop') ? '✓' : '◇'}</span><span className="timeline-main"><strong>{human(e.type)}</strong><span>{typeof e.data.agent === 'string' ? human(e.data.agent) : e.dispatchId ? `Dispatch ${short(e.dispatchId)}` : e.data.kind ? human(String(e.data.kind)) : 'Runtime event'}</span></span><span className="timeline-source">{e.source} · {e.confidence}</span><span className="row-arrow">↗</span>
      </button>)}</div> : <div className="timeline-empty">No events match this session and filter.</div>}
      <div className="retention-note">Showing {timeline.length} normalized observations available in retained logs. Older or rotated events may no longer be present.</div>
    </section>
    <footer><span>CANONKIT OBSERVATORY <i>·</i> LOCAL TELEMETRY</span><span>Workflow and approval state require direct evidence.</span></footer>
  </main>;
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? 'mono' : ''}>{value}</strong></div>;
}
function Detail({ item }: { item: Observation | Dispatch }) {
  if ('type' in item) return <>
    <div className="detail-hero"><span className="hero-icon">{item.type === 'gate' ? '⚑' : '◇'}</span><div><strong>{human(item.type)}</strong><span>{item.source} · {item.confidence}</span></div></div>
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
