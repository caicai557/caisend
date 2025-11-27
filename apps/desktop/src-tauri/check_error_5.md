   Compiling teleflow-desktop v0.0.0 (C:\Users\zz113\Desktop\鎵嶅皯\11.22\-\apps\desktop\src-tauri)
error[E0433]: failed to resolve: could not find `__cmd__execute_and_advance_workflow` in `script`
   --> src\lib.rs:269:31
    |
269 |             commands::script::execute_and_advance_workflow,
    |                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ could not find `__cmd__execute_and_advance_workflow` in `script`

error[E0412]: cannot find type `State` in this scope
 --> src\commands\script.rs:8:11
  |
8 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
  |           ^^^^^ not found in this scope
  |
help: consider importing one of these items
  |
2 + use ractor::State;
  |
2 + use tauri::State;
  |

error[E0412]: cannot find type `Arc` in this scope
 --> src\commands\script.rs:8:21
  |
8 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
  |                     ^^^ not found in this scope
  |
help: consider importing one of these structs
  |
2 + use crate::Arc;
  |
2 + use std::sync::Arc;
  |

error[E0405]: cannot find trait `ScriptRepositoryPort` in this scope
 --> src\commands\script.rs:8:29
  |
8 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
  |                             ^^^^^^^^^^^^^^^^^^^^ not found in this scope
  |
help: consider importing this trait through its public re-export
  |
2 + use crate::domain::ports::ScriptRepositoryPort;
  |

error[E0412]: cannot find type `State` in this scope
 --> src\commands\script.rs:9:10
  |
9 |     hub: State<'_, Arc<ContextHub>>,
  |          ^^^^^ not found in this scope
  |
help: consider importing one of these items
  |
2 + use ractor::State;
  |
2 + use tauri::State;
  |

error[E0412]: cannot find type `Arc` in this scope
 --> src\commands\script.rs:9:20
  |
9 |     hub: State<'_, Arc<ContextHub>>,
  |                    ^^^ not found in this scope
  |
help: consider importing one of these structs
  |
2 + use crate::Arc;
  |
2 + use std::sync::Arc;
  |

error[E0412]: cannot find type `ContextHub` in this scope
 --> src\commands\script.rs:9:24
  |
9 |     hub: State<'_, Arc<ContextHub>>,
  |                        ^^^^^^^^^^ not found in this scope
  |
help: consider importing this struct through its public re-export
  |
2 + use crate::ContextHub;
  |

error[E0425]: cannot find value `peer_id` in this scope
  --> src\commands\script.rs:22:21
   |
22 |         account_id, peer_id, step_id
   |                     ^^^^^^^ not found in this scope

error[E0425]: cannot find value `step_id` in this scope
  --> src\commands\script.rs:22:30
   |
22 |         account_id, peer_id, step_id
   |                              ^^^^^^^ not found in this scope

error[E0425]: cannot find value `peer_id` in this scope
  --> src\commands\script.rs:26:56
   |
26 |     let mut instance = repo.get_instance(&account_id, &peer_id)
   |                                                        ^^^^^^^ not found in this scope

error[E0425]: cannot find value `step_id` in this scope
  --> src\commands\script.rs:44:19
   |
44 |     if step.id != step_id {
   |                   ^^^^^^^ not found in this scope

error[E0425]: cannot find value `step_id` in this scope
  --> src\commands\script.rs:47:22
   |
47 |             step.id, step_id
   |                      ^^^^^^^ not found in this scope

error[E0425]: cannot find value `peer_id` in this scope
  --> src\commands\script.rs:75:18
   |
75 |         peer_id: peer_id.clone(), 
   |                  ^^^^^^^ not found in this scope

error[E0425]: cannot find value `peer_id` in this scope
  --> src\commands\script.rs:79:94
   |
79 |     tracing::info!("[Command] 馃殌 Instruction sent to Actor: account={}, peer={}", account_id, peer_id);
   |                                                                                               ^^^^^^^ not found in this scope

error[E0433]: failed to resolve: use of undeclared type `InstanceStatus`
  --> src\commands\script.rs:84:27
   |
84 |         instance.status = InstanceStatus::Completed;
   |                           ^^^^^^^^^^^^^^ use of undeclared type `InstanceStatus`
   |
help: consider importing one of these enums
   |
 2 + use crate::domain::workflow::instance::InstanceStatus;
   |
 2 + use crate::domain::workflow::script::InstanceStatus;
   |

error[E0425]: cannot find value `peer_id` in this scope
  --> src\commands\script.rs:85:78
   |
85 |         tracing::info!("[Command] Workflow completed for {}/{}", account_id, peer_id);
   |                                                                              ^^^^^^^ not found in this scope

error[E0412]: cannot find type `ScriptFlow` in this scope
   --> src\commands\script.rs:109:17
    |
109 | ) -> Result<Vec<ScriptFlow>, String> {
    |                 ^^^^^^^^^^ not found in this scope
    |
help: consider importing this struct through its public re-export
    |
  2 + use crate::domain::workflow::ScriptFlow;
    |

error[E0412]: cannot find type `State` in this scope
   --> src\commands\script.rs:108:11
    |
108 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
    |           ^^^^^ not found in this scope
    |
help: consider importing one of these items
    |
  2 + use ractor::State;
    |
  2 + use tauri::State;
    |

error[E0412]: cannot find type `Arc` in this scope
   --> src\commands\script.rs:108:21
    |
108 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
    |                     ^^^ not found in this scope
    |
help: consider importing one of these structs
    |
  2 + use crate::Arc;
    |
  2 + use std::sync::Arc;
    |

error[E0405]: cannot find trait `ScriptRepositoryPort` in this scope
   --> src\commands\script.rs:108:29
    |
108 |     repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
    |                             ^^^^^^^^^^^^^^^^^^^^ not found in this scope
    |
help: consider importing this trait through its public re-export
    |
  2 + use crate::domain::ports::ScriptRepositoryPort;
    |

error[E0412]: cannot find type `State` in this scope
   --> src\commands\script.rs:121:10
    |
121 |     hub: State<'_, Arc<ContextHub>>,
    |          ^^^^^ not found in this scope
    |
help: consider importing one of these items
    |
  2 + use ractor::State;
    |
  2 + use tauri::State;
    |

error[E0412]: cannot find type `Arc` in this scope
   --> src\commands\script.rs:121:20
    |
121 |     hub: State<'_, Arc<ContextHub>>,
    |                    ^^^ not found in this scope
    |
help: consider importing one of these structs
    |
  2 + use crate::Arc;
    |
  2 + use std::sync::Arc;
    |

error[E0412]: cannot find type `ContextHub` in this scope
   --> src\commands\script.rs:121:24
    |
121 |     hub: State<'_, Arc<ContextHub>>,
    |                        ^^^^^^^^^^ not found in this scope
    |
help: consider importing this struct through its public re-export
    |
  2 + use crate::ContextHub;
    |

error[E0412]: cannot find type `State` in this scope
   --> src\commands\script.rs:133:10
    |
133 |     hub: State<'_, Arc<ContextHub>>,
    |          ^^^^^ not found in this scope
    |
help: consider importing one of these items
    |
  2 + use ractor::State;
    |
  2 + use tauri::State;
    |

error[E0412]: cannot find type `Arc` in this scope
   --> src\commands\script.rs:133:20
    |
133 |     hub: State<'_, Arc<ContextHub>>,
    |                    ^^^ not found in this scope
    |
help: consider importing one of these structs
    |
  2 + use crate::Arc;
    |
  2 + use std::sync::Arc;
    |

error[E0412]: cannot find type `ContextHub` in this scope
   --> src\commands\script.rs:133:24
    |
133 |     hub: State<'_, Arc<ContextHub>>,
    |                        ^^^^^^^^^^ not found in this scope
    |
help: consider importing this struct through its public re-export
    |
  2 + use crate::ContextHub;
    |

warning: unused imports: `Deserialize` and `Serialize`
 --> src\actors\account.rs:2:13
  |
2 | use serde::{Deserialize, Serialize};
  |             ^^^^^^^^^^^  ^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: unused import: `crate::adapters::browser::cdp_adapter::CdpManager`
 --> src\managers\session_manager.rs:3:5
  |
3 | use crate::adapters::browser::cdp_adapter::CdpManager;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `crate::actors::supervisor`
 --> src\managers\session_manager.rs:8:5
  |
8 | use crate::actors::supervisor;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `crate::actors::account`
 --> src\managers\session_manager.rs:9:5
  |
9 | use crate::actors::account;
  |     ^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `tokio::sync::oneshot`
  --> src\managers\session_manager.rs:10:5
   |
10 | use tokio::sync::oneshot;
   |     ^^^^^^^^^^^^^^^^^^^^

warning: unused import: `std::sync::Arc`
 --> src\infrastructure\persistence\cache.rs:3:5
  |
3 | use std::sync::Arc;
  |     ^^^^^^^^^^^^^^

error[E0195]: lifetime parameters or bounds on method `pre_start` do not match the trait declaration
  --> src\actors\account.rs:42:14
   |
42 |       async fn pre_start(
   |  ______________^
43 | |         &self,
44 | |         _myself: ActorRef<Self::Msg>,
45 | |         args: Self::Arguments,
46 | |     ) -> Result<Self::State, ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle` do not match the trait declaration
  --> src\actors\account.rs:57:14
   |
57 |       async fn handle(
   |  ______________^
58 | |         &self,
59 | |         _myself: ActorRef<Self::Msg>,
60 | |         message: Self::Msg,
61 | |         state: &mut Self::State,
62 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `post_stop` do not match the trait declaration
   --> src\actors\account.rs:124:14
    |
124 |       async fn post_stop(
    |  ______________^
125 | |         &self,
126 | |         _myself: ActorRef<Self::Msg>,
127 | |         state: &mut Self::State,
128 | |     ) -> Result<(), ActorProcessingErr> {
    | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `pre_start` do not match the trait declaration
  --> src\actors\supervisor.rs:30:14
   |
30 |       async fn pre_start(
   |  ______________^
31 | |         &self,
32 | |         _myself: ActorRef<Self::Msg>,
33 | |         cdp_manager: Self::Arguments,
34 | |     ) -> Result<Self::State, ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle` do not match the trait declaration
  --> src\actors\supervisor.rs:43:14
   |
43 |       async fn handle(
   |  ______________^
44 | |         &self,
45 | |         myself: ActorRef<Self::Msg>,
46 | |         message: Self::Msg,
47 | |         state: &mut Self::State,
48 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle_supervisor_evt` do not match the trait declaration
  --> src\actors\supervisor.rs:88:14
   |
88 |       async fn handle_supervisor_evt(
   |  ______________^
89 | |         &self,
90 | |         myself: ActorRef<Self::Msg>,
91 | |         message: SupervisionEvent,
92 | |         state: &mut Self::State,
93 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

warning: unreachable pattern
   --> src\adapters\browser\cdp_adapter.rs:168:21
    |
168 |                     _ => {} // Ignore other events
    |                     ^ no value can reach this
    |
note: multiple earlier patterns match some of the same values
   --> src\adapters\browser\cdp_adapter.rs:168:21
    |
160 |                     Ok(_) => {
    |                     ----- matches some of the same values
...
164 |                     Err(e) => {
    |                     ------ matches some of the same values
...
168 |                     _ => {} // Ignore other events
    |                     ^ collectively making this unreachable
    = note: `#[warn(unreachable_patterns)]` (part of `#[warn(unused)]`) on by default

warning: unused variable: `app_handle`
   --> src\adapters\browser\cdp_adapter.rs:155:13
    |
155 |         let app_handle = self.app_handle.clone(); // Clone for closure
    |             ^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_app_handle`
    |
    = note: `#[warn(unused_variables)]` (part of `#[warn(unused)]`) on by default

error[E0308]: mismatched types
   --> src\commands\script.rs:101:8
    |
101 |     Ok(())
    |     -- ^^ expected `bool`, found `()`
    |     |
    |     arguments to this enum variant are incorrect
    |
help: the type constructed contains `()` due to the type of the argument passed
   --> src\commands\script.rs:101:5
    |
101 |     Ok(())
    |     ^^^--^
    |        |
    |        this argument influences the type of `Ok`
note: tuple variant defined here
   --> /rustc/ed61e7d7e242494fb7057f2657300d9e77bb4fcb\library\core\src\result.rs:554:5

warning: unused variable: `name`
  --> src\managers\script_manager.rs:15:30
   |
15 |     pub fn get_script(&self, name: &str) -> Option<String> {
   |                              ^^^^ help: if this is intentional, prefix it with an underscore: `_name`

Some errors have detailed explanations: E0195, E0308, E0405, E0412, E0425, E0433.
For more information about an error, try `rustc --explain E0195`.
warning: `teleflow-desktop` (lib) generated 9 warnings
error: could not compile `teleflow-desktop` (lib) due to 33 previous errors; 9 warnings emitted
