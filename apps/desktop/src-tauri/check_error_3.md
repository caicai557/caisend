   Compiling teleflow-desktop v0.0.0 (C:\Users\zz113\Desktop\鎵嶅皯\11.22\-\apps\desktop\src-tauri)
error[E0583]: file not found for module `script_manager`
 --> src\managers\mod.rs:4:1
  |
4 | pub mod script_manager;
  | ^^^^^^^^^^^^^^^^^^^^^^^
  |
  = help: to create the module `script_manager`, create file "src\managers\script_manager.rs" or "src\managers\script_manager\mod.rs"
  = note: if there is a `mod script_manager` elsewhere in the crate already, import it with `use crate::...` instead

error[E0433]: failed to resolve: could not find `ghost` in `infrastructure`
 --> src\actors\account.rs:6:28
  |
6 | use crate::infrastructure::ghost::circadian::CircadianRhythm;
  |                            ^^^^^ could not find `ghost` in `infrastructure`

error[E0433]: failed to resolve: could not find `ghost` in `infrastructure`
 --> src\actors\account.rs:7:28
  |
7 | use crate::infrastructure::ghost::biomechanics::HumanInput;
  |                            ^^^^^ could not find `ghost` in `infrastructure`

warning: unused imports: `Deserialize` and `Serialize`
 --> src\actors\account.rs:2:13
  |
2 | use serde::{Deserialize, Serialize};
  |             ^^^^^^^^^^^  ^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: unused import: `crate::adapters::browser::cdp_adapter::CdpManager`
 --> src\commands\script.rs:7:5
  |
7 | use crate::adapters::browser::cdp_adapter::CdpManager;
  |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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
  --> src\actors\account.rs:40:14
   |
40 |       async fn pre_start(
   |  ______________^
41 | |         &self,
42 | |         _myself: ActorRef<Self::Msg>,
43 | |         (config, cdp_manager): Self::Arguments,
44 | |     ) -> Result<Self::State, ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle` do not match the trait declaration
  --> src\actors\account.rs:54:14
   |
54 |       async fn handle(
   |  ______________^
55 | |         &self,
56 | |         _myself: ActorRef<Self::Msg>,
57 | |         message: Self::Msg,
58 | |         state: &mut Self::State,
59 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `post_stop` do not match the trait declaration
   --> src\actors\account.rs:121:14
    |
121 |       async fn post_stop(
    |  ______________^
122 | |         &self,
123 | |         _myself: ActorRef<Self::Msg>,
124 | |         state: &mut Self::State,
125 | |     ) -> Result<(), ActorProcessingErr> {
    | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `pre_start` do not match the trait declaration
  --> src\actors\supervisor.rs:28:14
   |
28 |       async fn pre_start(
   |  ______________^
29 | |         &self,
30 | |         _myself: ActorRef<Self::Msg>,
31 | |         cdp_manager: Self::Arguments,
32 | |     ) -> Result<Self::State, ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle` do not match the trait declaration
  --> src\actors\supervisor.rs:41:14
   |
41 |       async fn handle(
   |  ______________^
42 | |         &self,
43 | |         myself: ActorRef<Self::Msg>,
44 | |         message: Self::Msg,
45 | |         state: &mut Self::State,
46 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle_supervisor_evt` do not match the trait declaration
  --> src\actors\supervisor.rs:86:14
   |
86 |       async fn handle_supervisor_evt(
   |  ______________^
87 | |         &self,
88 | |         myself: ActorRef<Self::Msg>,
89 | |         message: SupervisionEvent,
90 | |         state: &mut Self::State,
91 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0782]: expected a type, found a trait
   --> src\adapters\browser\cdp_adapter.rs:161:24
    |
161 |                     Ok(Event::RuntimeBindingCalled(ev)) => {
    |                        ^^^^^

error[E0599]: no method named `try_state` found for reference `&AppHandle` in the current scope
  --> src\commands\script.rs:75:10
   |
74 |       let supervisor = hub.app_handle()
   |  ______________________-
75 | |         .try_state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>()
   | |_________-^^^^^^^^^
   |
   = help: items from traits can only be used if the trait is in scope
help: trait `Manager` which provides `try_state` is implemented but not in scope; perhaps you want to import it
   |
 1 + use tauri::Manager;
   |
help: there is a method `state` with a similar name
   |
75 -         .try_state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>()
75 +         .state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>()
   |

error[E0277]: the trait bound `tokio::sync::oneshot::Sender<std::option::Option<ActorRef<AccountMessage>>>: Clone` is not satisfied
  --> src\actors\supervisor.rs:10:24
   |
 7 | #[derive(Debug, Clone)]
   |                 ----- in this derive macro expansion
...
10 |     GetAccount(String, tokio::sync::oneshot::Sender<Option<ActorRef<AccountMessage>>>),
   |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `Clone` is not implemented for `tokio::sync::oneshot::Sender<std::option::Option<ActorRef<AccountMessage>>>`

error[E0521]: borrowed data escapes outside of associated function
   --> src\adapters\browser\cdp_adapter.rs:204:9
    |
188 |       fn handle_notification(app_handle: &AppHandle, account_id: &str, payload: &str) {
    |                              ----------  - let's call the lifetime of this reference `'1`
    |                              |
    |                              `app_handle` is a reference that is only valid in the associated function body
...
204 | /         tauri::async_runtime::spawn(async move {
205 | |             match serde_json::from_str::<NotificationPayload>(&payload_owned) {
206 | |                 Ok(notification) => {
207 | |                     tracing::info!(
...   |
257 | |         });
    | |          ^
    | |          |
    | |__________`app_handle` escapes the associated function body here
    |            argument requires that `'1` must outlive `'static`

Some errors have detailed explanations: E0195, E0277, E0433, E0521, E0583, E0599, E0782.
For more information about an error, try `rustc --explain E0195`.
warning: `teleflow-desktop` (lib) generated 7 warnings
error: could not compile `teleflow-desktop` (lib) due to 13 previous errors; 7 warnings emitted
