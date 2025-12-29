# Actor System Specification

## 1. Ractor Implementation

* **Framework**: `ractor` crate.
* **Topology**:
    `System` -> `AccountSupervisor` -> [`BrowserActor`, `WorkflowActor`]

## 2. Message Protocol (The Nervous System)

Messages must be strictly typed Enums.

```rust
// Example Structure
enum AccountMessage {
    // Commands
    Start { flow_id: String },
    Stop,
    // Signals (From Perception)
    Signal { 
        source: String, // "DOM", "Fiber", "OCR"
        payload: Vec<u8> // MessagePack binary
    },
    // Internals
    Heartbeat,
}
```

## 3. Fault Tolerance (Self-Healing)

If BrowserActor crashes (CDP disconnect), AccountSupervisor kills the process and spawns a new one.

The new BrowserActor signals WorkflowActor to "Resume".

WorkflowActor loads state from SQLite and continues execution.
