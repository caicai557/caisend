# Teleflow 2025: Deep Research & Optimization Log

**Date**: 2025-12-29
**Objective**: Validate and optimize the architecture by researching "Best Practices of Late 2025" for key functional areas.

---

## 1. Functional Area: Actor System (Concurrency & Fault Tolerance)

**Requirement**: Zero-lock concurrency, fault isolation, self-healing, high throughput (50+ accounts).

### Candidate 1: Ractor (The Pure Actor Model)

* **Concept**: A modern, tokio-based actor framework inspired by Erlang/OTP.
* **Pros**:
  * True message-passing (no shared state).
  * Built-in Supervision trees (essential for self-healing).
  * Type-safe messaging.
  * Small footprint compared to Actix.
* **Cons**:
  * Slightly higher learning curve than bare Tokio.
  * Message serialization overhead (minimal within process).

### Candidate 2: Bare Tokio + Channels (The Go Pattern)

* **Concept**: Spawning `tokio::task`s and communicating via `mpsc` channels.
* **Pros**:
  * Maximum flexibility.
  * Zero framework overhead.
  * Native Rust async feel.
* **Cons**:
  * "Supervision" must be manually implemented (detecting task panic/finish).
  * Lifecycle management (graceful shutdown, restart) is manual and error-prone.
  * Risk of "orphan tasks".

### Candidate 3: Actix (The Veteran)

* **Concept**: The oldest and most mature actor framework in Rust.
* **Pros**:
  * Extremely mature ecosystem.
  * Proven performance.
* **Cons**:
  * Heavyweight.
  * Own runtime (Arbiter) can conflict/complicate simple Tokio usage.
  * Overkill for a local desktop app agent system.

### 🏆 Best Practice Selection: Ractor

**Reasoning**: For a system requiring *self-healing* (restarting a crashed browser controller without crashing the app), Ractor's supervision tree is the "Killer Feature". Implementing reliable supervision on bare Tokio is complex and prone to bugs. Actix is too heavy. Ractor fits the "Ultra Think" philosophy of subtraction while providing the necessary robustness.

---

## 2. Functional Area: Durable Execution (Persistence)

**Requirement**: Resume from crash, atomic state transitions, high write frequency.

### Candidate 1: SQLite (WAL + JSONB)

* **Concept**: Single-file relational DB with Write-Ahead Logging and native JSON support.
* **Pros**:
  * **ACID**: Absolute guarantee of data integrity.
  * **JSONB**: Efficient storage and query of polymorphic state (Enums).
  * **Universal**: Debuggable with any SQL client.
  * **Performance**: With WAL and `synchronous=NORMAL`, can handle thousands of writes/sec.
* **Cons**:
  * Disk I/O overhead (mitigated by OS page cache).

### Candidate 2: Redb (Embedded Key-Value)

* **Concept**: Pure Rust, embedded, ACID, MVCC key-value store (LMDB alternative).
* **Pros**:
  * Blazing fast read/write.
  * Zero-copy read capabilities.
  * Type-safe tables.
* **Cons**:
  * No SQL query capability (harder to debug/audit state manually).
  * Schema evolution is manual.

### Candidate 3: Event Sourcing (Log-based)

* **Concept**: Append-only log of events. State is derived by replaying.
* **Pros**:
  * Perfect audit trail.
  * Time-travel debugging (TTD) is native.
* **Cons**:
  * Snapshotting complexity.
  * Schema migration for events is painful.
  * Over-engineering for a local agent system.

### 🏆 Best Practice Selection: SQLite (WAL + JSONB)

**Reasoning**: "Durable Execution" requires not just speed, but *debuggability* and *reliability*. SQLite is the industry standard for edge storage. The ability to inspect the `workflow_instances` table with a GUI tool is invaluable for development. Redb is faster but opaque. Event Sourcing is too complex for MVP.

---

## 3. Functional Area: Hybrid Perception (Sensing)

**Requirement**: 100% accuracy in reading messages, immune to DOM obfuscation.

### Candidate 1: React Fiber Traversal (The Surgeon)

* **Concept**: Reading the internal React component state directly from memory (via `__reactFiber$`).
* **Pros**:
  * **Truth**: Reads the data *before* it renders to DOM. Immune to CSS obfuscation or invisible text.
  * **Structured**: Gets objects, not just text strings.
* **Cons**:
  * Fragile: React internal structure changes (rare, but possible).
  * Complexity: Traversing the fiber tree is non-trivial.

### Candidate 2: WebDriver BiDi (The Standard)

* **Concept**: The new W3C standard for bidirectional browser automation (replacing CDP).
* **Pros**:
  * Standardized.
  * Better cross-browser support (Firefox/Chrome).
* **Cons**:
  * Still evolving in 2025.
  * CDP is still the "raw" power for Chrome-specific tricks (stealth).

### Candidate 3: Visual Perception (The Eye)

* **Concept**: Screenshot + Local OCR (PaddleOCR / Tesseract).
* **Pros**:
  * Unblockable (if human can see it, AI can see it).
* **Cons**:
  * Slow (100ms+).
  * CPU intensive.
  * Loss of semantic structure.

### 🏆 Best Practice Selection: Hybrid (Fiber + DOM Fallback)

**Reasoning**: Fiber is the "God Mode" for React apps like Telegram Web K/A. It gives structured data instantly. However, relying solely on it is risky. The architecture must use Fiber as Primary (L1) and DOM MutationObserver as Secondary (L2). BiDi is good but CDP is still superior for the low-level stealth required.

---

## 4. Functional Area: Stealth (Anti-Detection)

**Requirement**: Pass Cloudflare/Akamai/Telegram bot detection.

### Candidate 1: TLS Fingerprint Spoofing (JA4)

* **Concept**: Modifying the SSL Client Hello packet to match a real Chrome browser exactly.
* **Implementation**: Rust `reqwest` with `impersonate` or custom OpenSSL bindings.
* **Verdict**: Mandatory. Without this, the TCP handshake reveals the bot immediately.

### Candidate 2: CDP Stealth (The Mask)

* **Concept**: Overriding `navigator` properties (`webdriver`, `languages`, `plugins`) via CDP `Page.addScriptToEvaluateOnNewDocument`.
* **Verdict**: Mandatory. Standard practice.

### Candidate 3: Behavioral Biometrics (The Ghost)

* **Concept**: Simulating human jitter, reaction times, and mouse curves.
* **Verdict**: Mandatory. "Perfect" execution is a bot signal. We need "Human Imperfection".

### 🏆 Best Practice Selection: Full Stack Stealth

**Reasoning**: Stealth is not a single feature; it's a stack.

1. **Network**: TLS Impersonation (Rust level).
2. **Protocol**: HTTP/2 & QUIC frame ordering.
3. **Application**: CDP overrides.
4. **Behavior**: Bezier mouse + Gaussian typing delays.

---

## 5. Functional Area: Local Intelligence (Intent)

**Requirement**: Classify "Yes/No/Stop" with <50ms latency offline.

### Candidate 1: ONNX Runtime (ORT) + Quantized BERT

* **Concept**: Running a distilled model (e.g., `bge-m3-quantized`) via ONNX.
* **Pros**:
  * Fast (~20ms).
  * Standard format.
  * Rust bindings (`ort`) are excellent.
* **Cons**:
  * Model file size (~100MB).

### Candidate 2: Candle (Pure Rust)

* **Concept**: HuggingFace's pure Rust ML framework.
* **Pros**:
  * No external C++ runtime dependency (unlike ONNX).
  * "Metal" optimization for Mac, CUDA for Nvidia.
* **Cons**:
  * Ecosystem smaller than ONNX.

### Candidate 3: Llama.cpp (GGUF)

* **Concept**: Running LLMs.
* **Pros**:
  * Smartest.
* **Cons**:
  * Too slow for "Intent Classification" (hundreds of ms).
  * Overkill.

### 🏆 Best Practice Selection: ORT + BGE-M3

**Reasoning**: We need semantic similarity, not text generation. Embedding models are perfect for this. ONNX Runtime is the industry standard for deployment.

---

## 6. Self-Debate & Optimization (The Crucible)

**Debate 1: Ractor vs. Complexity**

* *Critic*: "Is Ractor really necessary? Can't we just use a `HashMap<Id, JoinHandle>`?"
* *Defense*: "With `JoinHandle`, you have to poll them. Who restarts them? Who propagates the 'Pause' signal to all children? Ractor gives us this structure for free. For 50 accounts, ad-hoc management is a recipe for spaghetti code."
* *Verdict*: Keep Ractor. It pays off in stability.

**Debate 2: SQLite JSONB Performance**

* *Critic*: "Writing JSONB on every state change (e.g., every character typed) will kill the disk."
* *Defense*: "Valid point. We don't persist *every character*. We persist *meaningful checkpoints* (e.g., 'Started Typing', 'Finished Typing'). The 'Typing' state can hold the target text, but the progress index can be in memory or persisted less frequently."
* *Optimization*: **Write-Behind Cache**. Use `moka` to cache state updates and flush to SQLite every 500ms or on critical transitions. This gives near-memory speed with eventual consistency (max 500ms data loss on power cut, which is acceptable).

**Debate 3: Fiber Stability**

* *Critic*: "Telegram updates their webpack build, class names change, Fiber props change. The bot breaks."
* *Defense*: "Fiber traversal relies on internal React keys which are relatively stable, but yes, it is fragile."
* *Optimization*: **Dynamic Selector Strategy**. The system should not hardcode paths. It should download a "Definition File" (hot-updateable) from our server that defines the current Fiber paths / CSS selectors. This allows us to fix all bots instantly without re-releasing the binary.

---

## 7. Final Optimized Architecture Summary

1. **Concurrency**: **Ractor** (Actor Model) for supervision.
2. **Persistence**: **SQLite (WAL)** with **Moka Write-Behind Cache** for performance/safety balance.
3. **Perception**: **React Fiber (L1)** + **MutationObserver (L2)**, configured via **Hot-swappable Definitions**.
4. **Stealth**: **TLS Impersonation** + **CDP Overrides** + **Bezier/Gaussian Behavior**.
5. **Intelligence**: **ONNX Runtime (ORT)** running **BGE-M3 (Quantized)** for semantic matching.

## 8. Granular Task Breakdown (For task.md)

### Phase 1: The Foundation (Core & Actors)

1. [ ] Initialize Rust Workspace & `.spec-kit`.
2. [ ] Implement `SystemSupervisor` (Ractor).
3. [ ] Implement `AccountActor` (Ractor).
4. [ ] Implement `AccountMessage` Protocol.
5. [ ] Verify "Phoenix Test" (Restart Logic).

### Phase 2: The Mind (Persistence)

6. [ ] Setup SQLite + SQLx (WAL Mode).
2. [ ] Implement `WorkflowState` Enum & JSONB Serialization.
3. [ ] Implement `Checkpointer` with `moka` Cache.
4. [ ] Verify "Highlander Test" (Persistence).

### Phase 3: The Senses (Perception)

10. [ ] Implement `ConsoleBridge` (MessagePack).
2. [ ] Create `perception.js` (Fiber Traversal Logic).
3. [ ] Implement Hot-Swappable Definition Loader.

### Phase 4: The Body (Action & Stealth)

13. [ ] Implement `CdpAdapter` (Chromiumoxide).
2. [ ] Implement `StealthMiddleware` (CDP Overrides).
3. [ ] Implement `InputSimulator` (Bezier/Gaussian).

### Phase 5: The Brain (Intelligence)

16. [ ] Integrate `ort` crate.
2. [ ] Implement `IntentClassifier` (Embedding + Cosine Similarity).

### Phase 6: The Face (UI)

18. [ ] Initialize Tauri v2 App.
2. [ ] Implement Sidebar UI.
3. [ ] Connect UI to Actor System (Commands/Events).
