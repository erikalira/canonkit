import type { Edge, Node } from '@xyflow/react';

export type Observation = {
  schemaVersion: number; timestamp: number; runtime: string; source: string; confidence: string;
  sessionId: string | null; eventId: string | null; dispatchId: string | null; agentId: string | null;
  type: string; data: Record<string, unknown>;
};
export type Dispatch = {
  executionId: string; agentId: string | null; agent: string | null; startedAt: number | null;
  endedAt: number | null; executionState: string; workflowState: string; approvalState: string;
  telemetryState: string; evidence: string[]; parallel: boolean; durationMs: number | null; tokens: Record<string, number> | null;
};
export type Session = {
  sessionId: string; runtime: string; projectId: string | null; worktreeId: string | null;
  branch: string | null; telemetry: string; dispatches: Dispatch[]; observations: Observation[];
  lastObservedAt: number;
};
export type RecentSession = {
  sessionId: string; runtime: string; projectId: string | null; branch: string | null;
  lastObservedAt: number; lastObservedType: string;
  workingAgents: { executionId: string; agent: string | null }[]; unendedDispatches: number;
};
export type RecentActivity = { windowMs: number; sessions: RecentSession[] };
export type GraphNodeData = { title: string; subtitle: string; state: string; kind: string; source?: string; context?: string };
export type GraphNode = Node<GraphNodeData>;
export type GraphView = 'observed' | 'reference';
export type Selection = { mode: 'recent' } | { mode: 'manual'; ids: string[] };
export type PanelEntry = { session: RecentSession; outsideWindow: boolean; shown: boolean };
export type TimelineRow = { sessionId: string; index: number; event: Observation };

export const short: (s: string, n?: number) => string;
export const human: (s: string) => string;
export const fmtDate: (ts?: number | null) => string;
export const observationNodeId: (sessionId: string, event: Observation, index: number) => string;
export function arrangeGraph(nodes: GraphNode[], edges: Edge[]): { nodes: GraphNode[]; edges: Edge[] };
export function referenceGraph(): { nodes: GraphNode[]; edges: Edge[] };
export function graphFor(sessions: Session[], view: GraphView): { nodes: GraphNode[]; edges: Edge[] };
export function preserveGraphNodes(graphNodes: GraphNode[], currentNodes: GraphNode[]): GraphNode[];
export function sessionIdOfNode(nodeId: string): string | null;
export function nodeIdForEvent(session: Session, index: number, summarised: boolean): string;
export function resolveNode(sessions: Session[], nodeId: string): { session: Session | undefined; item: Observation | Dispatch | null };
export const recentSelection: () => Selection;
export function shownSessionIds(selection: Selection, sessions: Session[], recent?: RecentActivity): string[];
export function toggleSelection(selection: Selection, id: string, derivedIds: string[]): Selection;
export function addSelection(selection: Selection, id: string, derivedIds: string[]): Selection;
export const showAllRecent: () => Selection;
export function pruneSelection(selection: Selection, sessions: Session[]): Selection;
export const stableLaneOrder: (previous: string[], shown: string[]) => string[];
export function summariseSession(session: Session): RecentSession;
export function panelEntries(sessions: Session[], recent: RecentActivity | undefined, shownIds: string[]): PanelEntry[];
export function mergedTimeline(sessions: Session[], filters?: { type?: string; agent?: string }): TimelineRow[];
export const timelineAgents: (sessions: Session[]) => string[];
