# Domain Model: Durable Execution

## 1. The Philosophy

Memory is volatile; Disk is truth. Every state transition must be persisted before it is acted upon. This guarantees that if the power plug is pulled, the system resumes exactly where it left off upon restart.

## 2. The Checkpoint Pattern (LVCP)

The Workflow Engine follows a strict cycle:

1. **L**ock: Acquire actor processing rights.
2. **V**alidate: Check preconditions.
3. **C**ompute: Determine next state (Pure Function).
4. **P**ersist: Write new state to SQLite (Atomic Transaction).
5. **C**ommit: Commit transaction.
6. **E**xecute: Perform side-effects (CDP Actions).

## 3. Storage Schema

* **Database**: SQLite (WAL Mode enabled for concurrency).
* **Table `workflow_instances`**:
  * `id`: UUID
  * `state`: JSONB (Stores the full state enum)
  * `status`: 'RUNNING' | 'PAUSED' | 'FAILED'
