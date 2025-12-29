# Architecture: The Hexagonal Actor System

## 1. The Pattern

We reject the traditional "Shared State" (Mutex/RwLock) concurrency model. We adopt the **Actor Model** exclusively using the `ractor` crate to ensure fault isolation and zero-lock concurrency.

## 2. Hexagonal Layers (Ports & Adapters)

* **Core (Domain)**: Pure logic. PFSM (Persistent Finite State Machine) definitions. No external dependencies.
* **Ports**: Traits defining interfaces for `Perception`, `Persistence`, and `Action`.
* **Adapters**:
  * `SqliteAdapter`: Implements Persistence.
  * `CdpAdapter`: Implements Action via Chromiumoxide.
  * `ConsoleBridgeAdapter`: Implements Perception via MessagePack.

## 3. System Topology

* **Root Supervisor**: Manages global resources (DB Pool) and supervision strategies.
* **Account Supervisor**: Manages the lifecycle of a single account's actors.
* **Worker Actors**:
  * `BrowserActor`: Manages CDP connection.
  * `WorkflowActor`: Manages PFSM logic.
