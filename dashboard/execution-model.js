// A deliberately small, versioned read model for future dashboard views.
// The source events predate this contract; normalization never mutates logs.
const SCHEMA_VERSION = 1;
const EVENTS = new Set(['prompt', 'gate', 'agent_start', 'agent_launch', 'agent_end', 'agent_stop', 'agent_resume']);
const SAFE_ID = /^[\w-]{1,64}$/;
const SAFE_AGENT = /^[\w.:-]{1,128}$/;
const finite = (n) => Number.isFinite(n) && n >= 0;
const str = (v, re) => typeof v === 'string' && re.test(v) ? v : null;

function normalizeEvent(e) {
  if (!e || !EVENTS.has(e.event) || !finite(e.ts)) return null;
  const sessionId = str(e.session, SAFE_ID);
  const dispatchId = str(e.id, SAFE_ID);
  const agentId = str(e.agent_id, SAFE_ID);
  const agentIdType = str(e.agent, SAFE_AGENT);
  const data = {};
  if (e.event === 'gate') {
    if (typeof e.kind === 'string' && /^[\w-]{1,64}$/.test(e.kind)) data.kind = e.kind;
    if (typeof e.tool === 'string' && /^[\w.-]{1,64}$/.test(e.tool)) data.tool = e.tool;
    if (Number.isSafeInteger(e.files) && e.files >= 0) data.files = e.files;
    if (Array.isArray(e.rules)) data.rules = e.rules.filter((v) => typeof v === 'string' && /^[\w-]{1,64}$/.test(v)).slice(0, 16);
    // A gate records that a rule was reached. It does not always block or mean
    // a user's approval was granted; the exact decision remains separate.
    data.decision = e.kind === 'excluded-by-config' || e.kind === 'context-size' ? 'allowed' :
      e.kind === 'high-risk-surface' || e.kind === 'secret-ask' || e.kind === 'perf-budget' || e.kind === 'git' ? 'confirmation-requested' :
      e.kind === 'secret-block' || e.kind === 'git-bypass' || e.kind === 'definition-of-done' ? 'blocked' : 'unknown';
  }
  if (e.event === 'agent_start' || e.event === 'agent_end') {
    if (agentIdType) data.agent = agentIdType;
    if (typeof e.mode === 'string' && /^(foreground|background)$/.test(e.mode)) data.mode = e.mode;
    if (finite(e.duration_ms)) data.durationMs = e.duration_ms;
    if (Number.isSafeInteger(e.tool_uses) && e.tool_uses >= 0) data.toolUses = e.tool_uses;
    if (Number.isSafeInteger(e.report_chars) && e.report_chars >= 0) data.reportChars = e.report_chars;
    if (e.tokens && typeof e.tokens === 'object') {
      const tokens = {};
      for (const key of ['input', 'output', 'cache_read', 'total'])
        if (Number.isSafeInteger(e.tokens[key]) && e.tokens[key] >= 0) tokens[key] = e.tokens[key];
      const cacheWrite = e.tokens.cache_creation ?? e.tokens.cache_write;
      const apiCalls = e.tokens.api_calls ?? e.tokens.calls;
      if (Number.isSafeInteger(cacheWrite) && cacheWrite >= 0) tokens.cacheWrite = cacheWrite;
      if (Number.isSafeInteger(apiCalls) && apiCalls >= 0) tokens.apiCalls = apiCalls;
      if (Object.keys(tokens).length) data.tokens = tokens;
    }
  }
  if (e.event === 'agent_resume') {
    if (typeof e.has_message === 'boolean') data.hasMessage = e.has_message;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    timestamp: e.ts,
    runtime: 'claude-code',
    source: 'runtime-event',
    confidence: 'observed',
    sessionId,
    // Event records have no stable event ID. Keep it null instead of fabricating one.
    eventId: null,
    dispatchId,
    agentId,
    type: e.event,
    data,
  };
}

function executionSnapshot(events) {
  const observations = [];
  for (const e of events) {
    const normalized = normalizeEvent(e);
    if (normalized) observations.push(normalized);
  }
  observations.sort((a, b) => a.timestamp - b.timestamp);
  const sessions = new Map();
  for (const event of observations) {
    if (!event.sessionId) continue;
    let session = sessions.get(event.sessionId);
    if (!session) sessions.set(event.sessionId, session = {
      sessionId: event.sessionId, runtime: 'claude-code', projectId: null, worktreeId: null,
      branch: null, telemetry: 'instrumented', dispatches: new Map(), observations: [],
    });
    session.observations.push(event);
    if (!event.dispatchId || !['agent_start', 'agent_launch', 'agent_end'].includes(event.type)) continue;
    // Dispatch identity is only reliable within a runtime session.
    const key = `${event.sessionId}:${event.dispatchId}`;
    let dispatch = session.dispatches.get(key);
    if (!dispatch) session.dispatches.set(key, dispatch = {
      executionId: event.dispatchId, agentId: null, agent: null, startedAt: null,
      endedAt: null, executionState: 'unknown', workflowState: 'unknown',
      approvalState: 'unknown', telemetryState: 'observed', evidence: [], parallel: false, durationMs: null, tokens: null,
    });
    if (!dispatch.evidence.includes(event.type)) dispatch.evidence.push(event.type);
    if (event.agentId) dispatch.agentId = event.agentId;
    if (event.data.agent) dispatch.agent = event.data.agent;
    if (event.type === 'agent_start') { dispatch.startedAt ??= event.timestamp; dispatch.executionState = 'active'; }
    if (event.type === 'agent_launch') { dispatch.startedAt ??= event.timestamp; dispatch.executionState = 'active'; }
    if (event.type === 'agent_end') {
      dispatch.endedAt = event.timestamp;
      dispatch.executionState = 'completed';
      // End records are cumulative snapshots. The latest one wins, including
      // null when the current retained record has no measurement.
      dispatch.durationMs = event.data.durationMs ?? null;
      dispatch.tokens = event.data.tokens ?? null;
    }
  }
  // `agent_stop` has no dispatch ID, but it does carry the runtime's agent ID.
  // Correlate it only when that ID points to exactly one dispatch in this
  // session. A resume target has no runtime ID, so it remains uncorrelated.
  for (const session of sessions.values()) {
    const byAgent = new Map();
    for (const dispatch of session.dispatches.values()) {
      if (!dispatch.agentId) continue;
      const list = byAgent.get(dispatch.agentId) || [];
      list.push(dispatch); byAgent.set(dispatch.agentId, list);
    }
    for (const event of session.observations) {
      if (event.type !== 'agent_stop' || !event.agentId) continue;
      const matches = byAgent.get(event.agentId) || [];
      if (matches.length !== 1) continue;
      const [dispatch] = matches;
      if (dispatch.startedAt != null && event.timestamp < dispatch.startedAt) continue;
      event.dispatchId = dispatch.executionId;
      dispatch.executionState = 'completed';
      dispatch.endedAt ??= event.timestamp;
      if (!dispatch.evidence.includes(event.type)) dispatch.evidence.push(event.type);
    }
  }
  const generatedAt = Date.now();
  for (const session of sessions.values()) {
    const dispatches = [...session.dispatches.values()];
    for (let i = 0; i < dispatches.length; i++) for (let j = i + 1; j < dispatches.length; j++) {
      const a = dispatches[i], b = dispatches[j];
      if (a.startedAt == null || b.startedAt == null) continue;
      const aEnd = a.endedAt ?? generatedAt, bEnd = b.endedAt ?? generatedAt;
      if (Math.max(a.startedAt, b.startedAt) < Math.min(aEnd, bEnd)) a.parallel = b.parallel = true;
    }
  }
  const sessionList = [...sessions.values()].map((s) => ({ ...s, dispatches: [...s.dispatches.values()] }));
  const agents = sessionList.flatMap((session) => session.dispatches.filter((dispatch) => dispatch.agentId).map((dispatch) => ({
    agentId: dispatch.agentId,
    sessionId: session.sessionId,
    executionId: dispatch.executionId,
    runtime: session.runtime,
    activity: dispatch.executionState === 'active' ? 'working' : dispatch.executionState === 'completed' ? 'finished' : 'unknown',
    updatedAt: dispatch.endedAt ?? dispatch.startedAt,
    observedActivity: dispatch.evidence.at(-1) ?? null,
  })));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    sessions: sessionList,
    agents,
    observations,
  };
}

module.exports = { SCHEMA_VERSION, normalizeEvent, executionSnapshot };
