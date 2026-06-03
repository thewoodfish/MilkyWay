# MILKYWAY_BUILDER.md
## Visual Flow Builder — Full Spec
### For Claude Code

Read alongside MILKYWAY_PHASE2.md and all other MILKYWAY_*.md files.
File: `frontend/app/builder/page.tsx`
Requires: wallet connected + SIWE signed in.

---

## What The Builder Is

A three-panel interface where users compose flows by connecting agents.
The canvas is the product. Everything else supports it.

```
┌─────────────────┬──────────────────────────┬─────────────────┐
│                 │                          │                 │
│  LEFT PANEL     │     CENTER CANVAS        │  RIGHT PANEL    │
│  Agent Library  │     Flow Composition     │  Configuration  │
│  280px fixed    │     flex-1               │  320px fixed    │
│                 │                          │                 │
└─────────────────┴──────────────────────────┴─────────────────┘
```

Full viewport height. No page scroll.
Each panel scrolls independently.

---

## Dependencies

```bash
npm install reactflow
npm install @tanstack/react-query   # for agent search
npm install recharts                # already in stack
```

React Flow handles the canvas, nodes, and edges.
All other UI is plain Tailwind.

---

## Left Panel — Agent Library

Fixed 280px. Scrollable.

```
┌─────────────────────────────────┐
│  🔍 Search agents               │
│  [________________________]     │
│                                 │
│  Filter: [Phase 2 Ready only ✓] │
│                                 │
│  Category:                      │
│  [All ▼]                        │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  [Avatar] Research Agent   🥉   │
│  DeFi · 0.001 ETH / job        │
│  847 jobs · 🟢                  │
│                                 │
│  [Avatar] Risk Analyzer    🥈   │
│  DeFi · 0.002 ETH / job        │
│  1,204 jobs · 🟢                │
│                                 │
│  [Avatar] Price Monitor    🥉   │
│  Data · 0.001 ETH / job        │
│  312 jobs · 🟢                  │
│                                 │
│  ...                            │
└─────────────────────────────────┘
```

**Search behaviour:**
- Queries GET /api/agents with search + category + phase2Ready=true
- Debounced 300ms
- Shows max 30 results, "Load more" at bottom

**Agent card in left panel (compact):**
```typescript
function LibraryAgentCard({ agent, onDragStart }: Props) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("agentId", String(agent.agentId));
        e.dataTransfer.effectAllowed = "copy";
        onDragStart(agent);
      }}
      className="
        flex items-center gap-3 p-3 rounded-lg
        border border-gray-100 bg-white
        hover:border-blue-200 hover:bg-blue-50
        cursor-grab active:cursor-grabbing
        transition-colors duration-150
        mb-2
      "
    >
      <AgentAvatar agentId={agent.agentId} logoUrl={agent.logoUrl}
        badgeTier={agent.badgeTier} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900 truncate">
            {agent.name}
          </span>
          <StatusDot status={agent.status} size="sm" />
        </div>
        <span className="text-xs text-gray-400">
          {agent.priceEth} ETH · {agent.jobCount} jobs
        </span>
      </div>
    </div>
  );
}
```

**Drag behaviour:**
- Drag card from left panel onto canvas → creates agent node
- If agent already on canvas → show "Already in flow" tooltip, prevent duplicate
- Each agent can only appear once per flow

---

## Center Panel — Canvas

Flex-1. React Flow canvas.

### Canvas Setup

```typescript
import ReactFlow, {
  addEdge, Background, Controls,
  useNodesState, useEdgesState,
  type Node, type Edge, type Connection
} from "reactflow";
import "reactflow/dist/style.css";

// Custom node type
const nodeTypes = { agentNode: AgentNode };

export function BuilderCanvas({
  onNodeSelect,
  onEdgeSelect,
  onCanvasClick,
  onFlowChange
}: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Drop agent from left panel onto canvas
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const agentId = Number(e.dataTransfer.getData("agentId"));
    if (!agentId) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - bounds.left - 75,
      y: e.clientY - bounds.top - 30
    };

    const newNode: Node = {
      id: `agent-${agentId}`,
      type: "agentNode",
      position,
      data: { agentId }
    };

    setNodes(n => [...n, newNode]);
    onFlowChange([...nodes, newNode], edges);
  }

  // Connect two agent nodes
  function onConnect(connection: Connection) {
    const newEdge: Edge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#2563EB", strokeWidth: 2 }
    };
    setEdges(e => addEdge(newEdge, e));
    onFlowChange(nodes, [...edges, newEdge]);
  }

  return (
    <div
      className="w-full h-full bg-gray-50"
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeSelect(node)}
        onEdgeClick={(_, edge) => onEdgeSelect(edge)}
        onPaneClick={onCanvasClick}
        fitView
        deleteKeyCode="Delete"
      >
        <Background color="#E5E7EB" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Empty state — shown when no nodes */}
      {nodes.length === 0 && (
        <div className="
          absolute inset-0 flex flex-col items-center justify-center
          pointer-events-none
        ">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-400">
              Drag agents here to start building
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Search for agents in the panel on the left
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Agent Node Component

```typescript
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useAgentData } from "@/hooks/useAgentData";

// Memoized — React Flow requires this for performance
export const AgentNode = memo(function AgentNode({ data, selected }: NodeProps) {
  const agent = useAgentData(data.agentId);

  if (!agent) return (
    <div className="w-40 h-16 bg-white border border-gray-200 rounded-xl
      flex items-center justify-center text-xs text-gray-400">
      Loading...
    </div>
  );

  const hasErrors = data.missingFields?.length > 0;

  return (
    <div className={`
      w-48 bg-white rounded-xl border-2 p-3
      transition-colors duration-150
      ${selected
        ? "border-blue-400 shadow-md shadow-blue-100"
        : hasErrors
          ? "border-amber-300"
          : "border-gray-200"
      }
    `}>
      {/* Input handle — left side */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />

      {/* Node content */}
      <div className="flex items-center gap-2">
        <AgentAvatar
          agentId={agent.agentId}
          logoUrl={agent.logoUrl}
          badgeTier={agent.badgeTier}
          size={32}
          showTooltip={false}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {agent.name}
          </p>
          <p className="text-xs text-gray-400">
            {agent.priceEth} ETH
          </p>
        </div>
      </div>

      {/* Error indicator */}
      {hasErrors && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50
          rounded px-2 py-1">
          ⚠️ {data.missingFields.length} field{data.missingFields.length > 1 ? "s" : ""} needed
        </div>
      )}

      {/* Output handle — right side */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
});
```

### Canvas Toolbar (top of canvas)

```
┌──────────────────────────────────────────────────────────────┐
│  [← Back]  My DeFi Flow          [Save]  [Clear canvas]     │
└──────────────────────────────────────────────────────────────┘
```

Small toolbar pinned to top of canvas panel.
Flow name is editable inline (click to edit).

---

## Right Panel — Configuration

Fixed 320px. Context-sensitive. Four states.

### State Management

```typescript
type RightPanelState =
  | { type: "overview" }
  | { type: "agent";   nodeId: string; agentId: number }
  | { type: "mapping"; edgeId: string; sourceAgentId: number; targetAgentId: number }
  | { type: "errors";  errors: FlowError[] }

// Parent builder page manages this state
// Passes down to RightPanel component
// Updates when user clicks node, edge, or canvas
```

---

### State 1 — Overview (nothing selected)

```typescript
function RightPanelOverview({
  flowAgents,
  flowSettings,
  onSettingsChange,
  onActivate,
  validation
}: Props) {
  return (
    <div className="h-full flex flex-col overflow-y-auto">

      {/* Flow Settings */}
      <Section title="Flow settings">
        <Field label="Name">
          <input
            value={flowSettings.name}
            onChange={e => onSettingsChange({ name: e.target.value })}
            placeholder="My flow"
            className="input-base"
          />
        </Field>

        <Field label="Trigger">
          <select
            value={flowSettings.trigger}
            onChange={e => onSettingsChange({ trigger: e.target.value })}
            className="input-base"
          >
            <option value="IMMEDIATE">Run immediately</option>
            <option value="SCHEDULED">Run on schedule</option>
            <option value="CONDITION">Run on condition</option>
          </select>
        </Field>

        {flowSettings.trigger === "SCHEDULED" && (
          <Field label="Every">
            <select
              value={flowSettings.triggerValue}
              onChange={e => onSettingsChange({ triggerValue: e.target.value })}
              className="input-base"
            >
              <option value="3600">1 hour</option>
              <option value="21600">6 hours</option>
              <option value="86400">1 day</option>
              <option value="604800">1 week</option>
            </select>
          </Field>
        )}

        {flowSettings.trigger === "CONDITION" && (
          <Field label="Condition">
            <input
              value={flowSettings.triggerValue}
              onChange={e => onSettingsChange({ triggerValue: e.target.value })}
              placeholder="e.g. ETH price < 2000"
              className="input-base"
            />
            <p className="text-xs text-gray-400 mt-1">
              Condition-based triggers coming in Phase 3.
              Use scheduled for now.
            </p>
          </Field>
        )}

        <Field label="Deadline">
          <select
            value={flowSettings.deadlineSeconds}
            onChange={e => onSettingsChange({ deadlineSeconds: Number(e.target.value) })}
            className="input-base"
          >
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="300">5 minutes</option>
            <option value="900">15 minutes</option>
            <option value="3600">1 hour</option>
          </select>
        </Field>
      </Section>

      {/* Cost Summary */}
      <Section title="Cost summary">
        {flowAgents.length === 0 ? (
          <p className="text-sm text-gray-400">
            Add agents to see cost breakdown.
          </p>
        ) : (
          <>
            {flowAgents.map(agent => (
              <div key={agent.agentId}
                className="flex justify-between text-sm py-1">
                <span className="text-gray-600 truncate mr-2">
                  {agent.name}
                </span>
                <span className="text-gray-900 font-mono flex-shrink-0">
                  {agent.priceEth} ETH
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Platform fee (1%)</span>
                <span className="font-mono">{protocolFee} ETH</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono text-blue-600">{total} ETH</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ≈ ${usdEstimate} at current rates
              </p>
            </div>
          </>
        )}
      </Section>

      {/* Deployment Checklist */}
      <Section title="Deployment">
        <ChecklistItem
          label="Network"
          value="Arbitrum One"
          status="ok"
        />
        <ChecklistItem
          label="Wallet"
          value={shortAddress}
          status="ok"
        />
        <ChecklistItem
          label="Balance"
          value={`${walletBalance} ETH`}
          status={hasSufficientBalance ? "ok" : "error"}
          errorAction={!hasSufficientBalance ? (
            <a href="https://bridge.arbitrum.io" target="_blank"
              className="text-xs text-blue-600 underline">
              Add funds →
            </a>
          ) : null}
        />
        <ChecklistItem
          label="Agents"
          value={`${flowAgents.length} connected`}
          status={flowAgents.length >= 1 ? "ok" : "warning"}
        />
        <ChecklistItem
          label="Fields"
          value={validation.allFieldsMapped ? "All mapped" : `${validation.missingCount} missing`}
          status={validation.allFieldsMapped ? "ok" : "warning"}
        />
        <ChecklistItem
          label="Trigger"
          value={TRIGGER_LABELS[flowSettings.trigger]}
          status="ok"
        />
      </Section>

      {/* Spacer pushes button to bottom */}
      <div className="flex-1" />

      {/* Action buttons — always at bottom */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={onActivate}
          disabled={!validation.canActivate}
          className="
            w-full py-3 rounded-lg font-semibold text-sm
            transition-colors duration-150
            bg-blue-600 text-white
            hover:bg-blue-700
            disabled:bg-gray-100 disabled:text-gray-400
            disabled:cursor-not-allowed
          "
        >
          {validation.canActivate ? "Activate Flow →" : "Fix issues to activate"}
        </button>
        <button
          onClick={onSave}
          className="
            w-full py-2 mt-2 rounded-lg text-sm
            text-gray-500 hover:text-gray-700
            transition-colors duration-150
          "
        >
          Save without activating
        </button>
      </div>
    </div>
  );
}
```

---

### State 2 — Agent Selected

```typescript
function RightPanelAgent({ agentId, flowData, onUpdate, onRemove }: Props) {
  const agent = useAgentData(agentId);
  const about = useAboutSchema(agentId);
  const [staticInputs, setStaticInputs] = useState(flowData.staticInputs || {});
  const [inputMappings, setInputMappings] = useState(flowData.inputMapping || {});

  const previousAgent = usePreviousAgent(agentId); // agent before this in flow

  if (!agent || !about) return <LoadingSkeleton />;

  return (
    <div className="h-full flex flex-col overflow-y-auto">

      {/* Agent header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <AgentAvatar agentId={agentId} logoUrl={agent.logoUrl}
            badgeTier={agent.badgeTier} size={44} />
          <div>
            <p className="font-semibold text-gray-900">{agent.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusDot status={agent.status} size="sm" />
              <span className="text-xs text-gray-400">
                {agent.jobCount} jobs · {agent.priceEth} ETH
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs section */}
      <Section title="What it needs">
        <p className="text-xs text-gray-400 mb-3">
          Fill each field manually or map it from the previous agent's output.
        </p>

        {Object.entries(about.input_schema).map(([field, def]) => {
          const d = def as any;
          const hasPreviousOutput = previousAgent &&
            previousAgent.outputSchema?.[field];
          const currentMapping = inputMappings[field];
          const currentStatic = staticInputs[field];

          return (
            <div key={field} className="mb-4">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700">
                  {field}
                </label>
                {d.required && (
                  <span className="text-xs text-blue-600 bg-blue-50
                    px-1.5 py-0.5 rounded">
                    required
                  </span>
                )}
                {!d.required && (
                  <span className="text-xs text-gray-400 bg-gray-50
                    px-1.5 py-0.5 rounded">
                    optional
                  </span>
                )}
              </div>

              {d.description && (
                <p className="text-xs text-gray-400 mb-1">{d.description}</p>
              )}

              {/* Map from previous agent OR fill manually */}
              {hasPreviousOutput ? (
                <div className="flex gap-2">
                  <select
                    value={currentMapping || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setInputMappings(prev => ({
                        ...prev,
                        [field]: val || undefined
                      }));
                      if (val) {
                        // Clear static if mapping is set
                        setStaticInputs(prev => {
                          const next = { ...prev };
                          delete next[field];
                          return next;
                        });
                      }
                    }}
                    className="input-base flex-1 text-xs"
                  >
                    <option value="">— fill manually —</option>
                    {Object.keys(previousAgent.outputSchema).map(outField => (
                      <option key={outField} value={outField}>
                        ← {outField} (from {previousAgent.name})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Manual input — shown when no mapping selected */}
              {!currentMapping && (
                <input
                  type={d.type === "number" ? "number" : "text"}
                  value={currentStatic ?? d.default ?? ""}
                  onChange={e => setStaticInputs(prev => ({
                    ...prev,
                    [field]: d.type === "number"
                      ? Number(e.target.value)
                      : e.target.value
                  }))}
                  placeholder={d.description || `Enter ${field}`}
                  className={`
                    input-base w-full
                    ${d.required && !currentStatic && !currentMapping
                      ? "border-amber-300 bg-amber-50"
                      : ""}
                  `}
                />
              )}

              {/* Mapping indicator */}
              {currentMapping && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-emerald-600">
                    ✓ Mapped from {previousAgent.name}.{currentMapping}
                  </span>
                  <button
                    onClick={() => setInputMappings(prev => {
                      const next = { ...prev };
                      delete next[field];
                      return next;
                    })}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* Outputs section */}
      <Section title="What it returns">
        <p className="text-xs text-gray-400 mb-3">
          These outputs are available to the next agent in your flow.
        </p>
        <div className="space-y-2">
          {Object.entries(about.output_schema).map(([field, def]) => {
            const d = def as any;
            return (
              <div key={field}
                className="flex items-start justify-between py-2
                  border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {field}
                  </span>
                  {d.description && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {d.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 bg-gray-50
                  px-2 py-0.5 rounded ml-2 flex-shrink-0">
                  {d.type}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <button
          onClick={onRemove}
          className="flex-1 py-2 rounded-lg text-sm text-red-500
            border border-red-100 hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
        <a
          href={`/agents/${agentId}`}
          target="_blank"
          className="flex-1 py-2 rounded-lg text-sm text-gray-500
            border border-gray-200 hover:bg-gray-50 transition-colors
            text-center"
        >
          View page ↗
        </a>
      </div>
    </div>
  );
}
```

---

### State 3 — Connection / Arrow Selected

```typescript
function RightPanelMapping({
  sourceAgentId,
  targetAgentId,
  currentMappings,
  onMappingChange
}: Props) {
  const sourceAbout = useAboutSchema(sourceAgentId);
  const targetAbout = useAboutSchema(targetAgentId);
  const sourceAgent = useAgentData(sourceAgentId);
  const targetAgent = useAgentData(targetAgentId);

  if (!sourceAbout || !targetAbout) return <LoadingSkeleton />;

  // Compute auto-matches
  const autoMatches = computeAutoMatches(
    sourceAbout.output_schema,
    targetAbout.input_schema
  );

  // Unmatched required fields
  const missingRequired = Object.entries(targetAbout.input_schema)
    .filter(([field, def]) => {
      const d = def as any;
      return d.required && !autoMatches[field] && !currentMappings[field];
    });

  return (
    <div className="h-full overflow-y-auto">

      {/* Connection header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900 truncate">
            {sourceAgent?.name}
          </span>
          <span className="text-blue-400 flex-shrink-0">→</span>
          <span className="font-medium text-gray-900 truncate">
            {targetAgent?.name}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Data flowing between these agents
        </p>
      </div>

      {/* Auto matches */}
      {Object.keys(autoMatches).length > 0 && (
        <Section title="Automatic matches">
          <p className="text-xs text-gray-400 mb-2">
            These fields matched automatically by name and type.
          </p>
          {Object.entries(autoMatches).map(([targetField, sourceField]) => (
            <div key={targetField}
              className="flex items-center gap-2 py-2
                border-b border-gray-50 last:border-0">
              <div className="flex-1 text-xs">
                <span className="text-gray-500">{sourceField}</span>
                <span className="text-gray-300 mx-1">
                  ({sourceAbout.output_schema[sourceField as string]?.type})
                </span>
              </div>
              <span className="text-emerald-400 text-xs flex-shrink-0">→</span>
              <div className="flex-1 text-xs text-right">
                <span className="text-gray-700 font-medium">{targetField}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Manual mappings */}
      <Section title="Manual mappings">
        <p className="text-xs text-gray-400 mb-3">
          Map additional fields from {sourceAgent?.name} output
          to {targetAgent?.name} input.
        </p>
        {Object.entries(targetAbout.input_schema)
          .filter(([field]) => !autoMatches[field])
          .map(([targetField, def]) => {
            const d = def as any;
            const currentMapping = currentMappings[targetField];

            return (
              <div key={targetField} className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    {targetField}
                  </label>
                  {d.required && !currentMapping && (
                    <span className="text-xs text-amber-600 bg-amber-50
                      px-1.5 py-0.5 rounded">
                      required
                    </span>
                  )}
                </div>
                <select
                  value={currentMapping || ""}
                  onChange={e => onMappingChange(targetField, e.target.value)}
                  className={`
                    input-base w-full text-xs
                    ${d.required && !currentMapping
                      ? "border-amber-300"
                      : ""}
                  `}
                >
                  <option value="">— not mapped (fill on agent) —</option>
                  {Object.keys(sourceAbout.output_schema).map(outField => (
                    <option key={outField} value={outField}>
                      {outField} ({sourceAbout.output_schema[outField]?.type})
                    </option>
                  ))}
                </select>
              </div>
            );
          })
        }
      </Section>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <Section title="⚠️ Still needed">
          <p className="text-xs text-amber-600 mb-2">
            These required fields have no mapping.
            Fill them statically on the agent.
          </p>
          {missingRequired.map(([field]) => (
            <div key={field}
              className="text-xs text-amber-700 bg-amber-50
                rounded px-3 py-2 mb-1">
              {field} — go to {targetAgent?.name} to fill
            </div>
          ))}
        </Section>
      )}

    </div>
  );
}
```

---

### State 4 — Validation Errors

```typescript
function RightPanelErrors({ errors, onJumpTo }: Props) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="font-semibold text-gray-900">
            {errors.length} issue{errors.length > 1 ? "s" : ""} to fix
          </p>
          <p className="text-xs text-gray-400">
            Fix these before activating
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {errors.map((error, i) => (
          <div key={i}
            className="border border-red-100 bg-red-50 rounded-lg p-3">
            <p className="text-sm font-medium text-red-700">
              {error.agentName || "Flow"}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {error.message}
            </p>
            {error.nodeId && (
              <button
                onClick={() => onJumpTo(error.nodeId!)}
                className="text-xs text-blue-600 underline mt-2"
              >
                Go to agent →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Field Matching Algorithm

```typescript
interface FieldMatch {
  targetField: string;
  sourceField: string;
  matchType: "exact" | "type" | "none";
}

function computeAutoMatches(
  outputSchema: Record<string, any>,
  inputSchema: Record<string, any>
): Record<string, string> {
  const matches: Record<string, string> = {};

  for (const [targetField, targetDef] of Object.entries(inputSchema)) {
    const td = targetDef as any;

    // Exact name + type match
    if (
      outputSchema[targetField] &&
      isTypeCompatible(outputSchema[targetField].type, td.type)
    ) {
      matches[targetField] = targetField;
      continue;
    }

    // Type-only match — first compatible field
    const typeMatch = Object.entries(outputSchema).find(
      ([, srcDef]) => isTypeCompatible((srcDef as any).type, td.type)
    );
    if (typeMatch) {
      matches[targetField] = typeMatch[0];
    }
  }

  return matches;
}

function isTypeCompatible(sourceType: string, targetType: string): boolean {
  if (sourceType === targetType) return true;
  // number can be coerced to string
  if (sourceType === "number" && targetType === "string") return true;
  // any type is compatible with string (JSON serialised)
  if (targetType === "string") return true;
  return false;
}
```

---

## Flow Validation

```typescript
interface FlowValidation {
  canActivate: boolean;
  allFieldsMapped: boolean;
  missingCount: number;
  errors: FlowError[];
}

function validateFlow(
  nodes: Node[],
  edges: Edge[],
  agentInputs: Record<string, AgentInputState>,
  flowSettings: FlowSettings,
  walletBalance: string,
  totalCost: string
): FlowValidation {
  const errors: FlowError[] = [];

  // Must have at least one agent
  if (nodes.length === 0) {
    errors.push({ message: "Add at least one agent to your flow" });
  }

  // Check each agent's required inputs
  let missingCount = 0;
  for (const node of nodes) {
    const agentId = node.data.agentId;
    const inputs = agentInputs[agentId];
    const about = getAboutSchema(agentId);

    if (!about) continue;

    for (const [field, def] of Object.entries(about.input_schema)) {
      const d = def as any;
      if (!d.required) continue;

      const hasStatic = inputs?.staticInputs?.[field] !== undefined;
      const hasMapping = inputs?.inputMapping?.[field];

      if (!hasStatic && !hasMapping) {
        missingCount++;
        errors.push({
          nodeId: node.id,
          agentName: node.data.name,
          message: `"${field}" is required but has no value`
        });
      }
    }
  }

  // Sufficient balance
  if (parseFloat(walletBalance) < parseFloat(totalCost)) {
    errors.push({
      message: `Insufficient balance. Need ${totalCost} ETH, have ${walletBalance} ETH`
    });
  }

  return {
    canActivate: errors.length === 0,
    allFieldsMapped: missingCount === 0,
    missingCount,
    errors
  };
}
```

---

## Shared UI Primitives (builder only)

```typescript
// Section wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-gray-100">
      <h3 className="text-xs font-semibold text-gray-500 uppercase
        tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Checklist item for deployment section
function ChecklistItem({ label, value, status, errorAction }: ChecklistItemProps) {
  const icon = status === "ok" ? "✅" : status === "warning" ? "⚠️" : "❌";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-700">{value}</span>
        <span className="text-xs">{icon}</span>
        {errorAction}
      </div>
    </div>
  );
}

// Base input class (add to globals.css)
// .input-base {
//   @apply w-full text-sm border border-gray-200 rounded-lg px-3 py-2
//          focus:outline-none focus:ring-2 focus:ring-blue-100
//          focus:border-blue-400 transition-colors;
// }
```

---

## Data Hooks

```typescript
// hooks/useAgentData.ts
// Reads agent from cache or fetches from /api/agents/:id
export function useAgentData(agentId: number) {
  const { data } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => fetch(`/api/agents/${agentId}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000  // 5 minutes
  });
  return data;
}

// hooks/useAboutSchema.ts
// Fetches /about schema for an agent
export function useAboutSchema(agentId: number) {
  const { data } = useQuery({
    queryKey: ["about", agentId],
    queryFn: () => fetch(`/api/agents/${agentId}/about`).then(r => r.json()),
    staleTime: 5 * 60 * 1000
  });
  return data;
}

// hooks/usePreviousAgent.ts
// Returns the agent immediately before this one in the flow
export function usePreviousAgent(agentId: number) {
  // Read from flow state context
  // Find node with this agentId, find its incoming edge, return source agent
}
```

---

## Build Order for Claude Code

```
1.  Install reactflow + @tanstack/react-query
2.  Write AgentNode component (memoized)
3.  Write BuilderCanvas (React Flow setup, drop handler)
4.  Write left panel (LibraryAgentCard, search, filter)
5.  Write right panel shell (state switcher)
6.  Write RightPanelOverview (flow settings + cost + checklist)
7.  Write RightPanelAgent (inputs + outputs + mappings)
8.  Write RightPanelMapping (connection detail)
9.  Write RightPanelErrors (validation list)
10. Write computeAutoMatches algorithm
11. Write validateFlow function
12. Wire all three panels together in builder/page.tsx
13. Wire activate flow → POST /api/flows/create → lockPayment wagmi
14. End-to-end test: drag two agents, connect, fill fields, activate
```

---

## Common Mistakes — Never Make These

- **Always memoize React Flow node components.**
  Unmemoized nodes cause severe performance issues with React Flow.
- **Never allow the same agent twice in one flow.**
  Check before adding a dragged node. Show a tooltip if duplicate.
- **Always fetch /about fresh when agent is dropped on canvas.**
  Stale schema causes wrong field matching.
- **Auto-match runs on connect, not on drop.**
  The connection defines the data flow. Matching needs both ends.
- **The Activate button is always visible, always at the bottom.**
  Never hide it. Disable it with a clear reason when invalid.
- **Right panel state changes on click, not on hover.**
  Hover is too sensitive on a drag canvas.
- **Save the flow to Postgres before calling lockPayment on-chain.**
  Never submit a transaction without a backend record first.
- **Canvas background is gray-50, not white.**
  White canvas looks empty. Subtle dot grid helps users orient.
- **Delete key removes selected node from canvas.**
  React Flow handles this — set deleteKeyCode="Delete".
- **Never show the raw /about JSON to users.**
  Always render it as human-readable fields and labels.

---

*MilkyWay Visual Builder*
*The canvas where flows are born.*