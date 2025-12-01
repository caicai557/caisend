# ADR-004: Persistent Behavior Tree (PBT) Architecture

## Status
Proposed

## Context
The current "Celestial Coordinates" project requires moving from a rigid Progressive Finite State Machine (PFSM) to a more adaptive, goal-oriented decision-making system. The "Spiritual Pivot" (灵枢) campaign aims to implement a Persistent Behavior Tree (PBT) engine.

Unlike traditional game AI behavior trees which are ephemeral and tick every frame, our PBT needs to:
1.  **Persist**: Survive application restarts and crashes (Long-Running Transactions).
2.  **Async**: Handle long-running actions (e.g., "Wait for 5 minutes", "Wait for User Reply").
3.  **Integrate**: Work seamlessly with the existing `WorkflowEngine` and `AccountActor`.

## Decision

We will implement a **Data-Driven, State-Persisted Behavior Tree Engine**.

### 1. Core Concepts

*   **Definition (Static)**: The tree structure, defined in JSON. Immutable at runtime.
*   **Instance (Dynamic)**: The runtime state, including current node status and blackboard data. Persisted in SQLite.
*   **Tick**: A discrete execution cycle triggered by the `AccountActor`.

### 2. Schema Design

The schema will be defined in `domain::behavior_tree::schema`.

```rust
pub enum BtNodeType {
    // Composites
    Sequence,       // AND logic
    Selector,       // OR logic
    Parallel,       // Concurrent execution
    
    // Decorators
    Inverter,       // NOT logic
    Repeater,       // Loop
    Retry,          // Error handling
    Timeout,        // Time limits
    
    // Leaves
    Action,         // Side effects (SendMessage, Click)
    Condition,      // Checks (IsLoggedIn, HasUnread)
    Wait,           // Time-based suspension
    SubTree,        // Modular reuse
}
```

### 3. Persistence Model

We will use the **LVCP (Load-Validate-Compute-Persist)** pattern, similar to the `WorkflowEngine`.

*   **Table**: `behavior_tree_instances`
*   **State**:
    *   `node_states`: Map<NodeID, NodeRuntimeState> (Tracks Running/Paused nodes)
    *   `blackboard`: JSON object (Shared memory)
    *   `status`: Running / Completed / Failed / Cancelled

### 4. Execution Flow

1.  **Trigger**: `AccountActor` receives a `Tick` message (or a specific event).
2.  **Load**: `WorkflowPbtBridge` loads the `BehaviorTreeInstance`.
3.  **Tick**: `BehaviorTreeEngine::tick(&mut instance, &definition, &context)` is called.
    *   Traverses the tree from Root.
    *   Skips nodes that are already `Success` (if parent is Sequence) or `Failure` (if parent is Selector) *within the same tick* (optimization).
    *   For `Running` nodes, resumes execution.
4.  **Action Execution**:
    *   Actions return `NodeStatus::Running` if they need to wait (e.g., network delay, user input).
    *   This suspends the tree until the next Tick.
5.  **Persist**: Updated instance state is saved to DB.

### 5. Integration with PFSM

*   **PFSM as Scheduler**: The high-level `WorkflowEngine` (PFSM) schedules PBT execution via the `ExecuteBehaviorTree` node.
*   **PBT as Micro-Decision**: The PBT handles the detailed interaction logic (e.g., "Login Flow", "Chat Strategy").
*   **Context Passing**:
    *   PFSM -> PBT: `context_mapping` copies data from Workflow variables to PBT Blackboard.
    *   PBT -> PFSM: Upon completion, PBT output can be mapped back to Workflow variables.

## Consequences

### Positive
*   **Resilience**: Can recover from crashes at any "Running" node.
*   **Flexibility**: Behavior can be modified by changing JSON definitions without recompiling code.
*   **Debuggability**: State is fully inspectable in the database.

### Negative
*   **Complexity**: State management for `Parallel` nodes and complex Decorators is non-trivial.
*   **Performance**: Database I/O on every Tick (mitigated by not ticking every frame, only on events/timers).

## Implementation Plan

1.  **Schema Refinement**: Finalize `BtNodeType` and config structures.
2.  **Engine Core**: Implement `tick` logic for Composites and Decorators.
3.  **Action Interface**: Define the `ActionContext` trait for side effects.
4.  **Testing**: Extensive unit tests for each node type and persistence recovery.
