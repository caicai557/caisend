   Compiling teleflow-desktop v0.0.0 (C:\Users\zz113\Desktop\鎵嶅皯\11.22\-\apps\desktop\src-tauri)
error[E0432]: unresolved import `crate::managers::script_manager`
 --> src\managers\session_manager.rs:5:22
  |
5 | use crate::managers::script_manager::ScriptManager; // Added
  |                      ^^^^^^^^^^^^^^ could not find `script_manager` in `managers`

error[E0432]: unresolved import `crate::actors`
 --> src\managers\session_manager.rs:8:12
  |
8 | use crate::actors::supervisor;
  |            ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `persistence` in `infrastructure`
 --> src\infrastructure\context_hub.rs:7:28
  |
7 | use crate::infrastructure::persistence::cache::CacheManager;
  |                            ^^^^^^^^^^^ could not find `persistence` in `infrastructure`

error[E0432]: unresolved import `crate::actors`
 --> src\managers\session_manager.rs:9:12
  |
9 | use crate::actors::account;
  |            ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
  --> src\commands\script.rs:75:46
   |
75 |         .try_state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>()
   |                                              ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
  --> src\commands\script.rs:82:28
   |
82 |     supervisor.cast(crate::actors::supervisor::SupervisorMessage::GetAccount(account_id.clone(), tx))
   |                            ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
  --> src\commands\script.rs:95:23
   |
95 |     actor.cast(crate::actors::account::AccountMessage::ExecuteWorkflow { 
   |                       ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
  --> src\managers\session_manager.rs:92:89
   |
92 |             let supervisor = match app_handle_clone.try_state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>() {
   |                                                                                         ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
   --> src\managers\session_manager.rs:101:33
    |
101 |             let config = crate::actors::account::AccountConfig {
    |                                 ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
   --> src\managers\session_manager.rs:107:52
    |
107 |             if let Err(e) = supervisor.cast(crate::actors::supervisor::SupervisorMessage::SpawnAccount { config }) {
    |                                                    ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
   --> src\managers\session_manager.rs:130:52
    |
130 |             if let Err(e) = supervisor.cast(crate::actors::supervisor::SupervisorMessage::GetAccount(account_id_clone.clone(), tx)) {
    |                                                    ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
   --> src\managers\session_manager.rs:137:55
    |
137 |                     if let Err(e) = actor.cast(crate::actors::account::AccountMessage::Connect { port }) {
    |                                                       ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `actors` in the crate root
  --> src\lib.rs:66:28
   |
66 |                     crate::actors::supervisor::SystemSupervisor,
   |                            ^^^^^^ could not find `actors` in the crate root

error[E0433]: failed to resolve: could not find `Event` in `chromiumoxide`
   --> src\adapters\browser\cdp_adapter.rs:160:39
    |
160 |                     Ok(chromiumoxide::Event::RuntimeBindingCalled(ev)) => {
    |                                       ^^^^^ could not find `Event` in `chromiumoxide`
    |
help: consider importing one of these items
    |
  1 + use chromiumoxide::cdp::Event;
    |
  1 + use notify::Event;
    |
  1 + use tauri::Event;
    |
  1 + use tauri::fs::Event;
    |
    = and 1 other candidate
help: if you import `Event`, refer to it directly
    |
160 -                     Ok(chromiumoxide::Event::RuntimeBindingCalled(ev)) => {
160 +                     Ok(Event::RuntimeBindingCalled(ev)) => {
    |

warning: unused import: `crate::adapters::browser::cdp_adapter::CdpManager`
 --> src\commands\script.rs:7:5
  |
7 | use crate::adapters::browser::cdp_adapter::CdpManager;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: unused import: `crate::adapters::browser::cdp_adapter::CdpManager`
 --> src\managers\session_manager.rs:3:5
  |
3 | use crate::adapters::browser::cdp_adapter::CdpManager;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: unused import: `tokio::sync::oneshot`
  --> src\managers\session_manager.rs:10:5
   |
10 | use tokio::sync::oneshot;
   |     ^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `app_handle` found for struct `tauri::State<'_, Arc<ContextHub>>` in the current scope
  --> src\commands\script.rs:74:26
   |
74 |     let supervisor = hub.app_handle()
   |                          ^^^^^^^^^^ private field, not a method
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `app_handle`, perhaps you need to implement it:
           candidate #1: `Manager`

Some errors have detailed explanations: E0432, E0433, E0599.
For more information about an error, try `rustc --explain E0432`.
warning: `teleflow-desktop` (lib) generated 3 warnings
error: could not compile `teleflow-desktop` (lib) due to 15 previous errors; 3 warnings emitted
