   Compiling teleflow-desktop v0.0.0 (C:\Users\zz113\Desktop\鎵嶅皯\11.22\-\apps\desktop\src-tauri)
warning: unused imports: `Deserialize` and `Serialize`
 --> src\actors\account.rs:2:13
  |
2 | use serde::{Deserialize, Serialize};
  |             ^^^^^^^^^^^  ^^^^^^^^^
  |
  = note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default

warning: unused imports: `AppHandle` and `Runtime`
 --> src\commands\script.rs:1:20
  |
1 | use tauri::{State, AppHandle, Manager, Runtime};
  |                    ^^^^^^^^^           ^^^^^^^

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
  --> src\actors\account.rs:42:14
   |
42 |       async fn pre_start(
   |  ______________^
43 | |         &self,
44 | |         _myself: ActorRef<Self::Msg>,
45 | |         (config, cdp_manager): Self::Arguments,
46 | |     ) -> Result<Self::State, ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `handle` do not match the trait declaration
  --> src\actors\account.rs:56:14
   |
56 |       async fn handle(
   |  ______________^
57 | |         &self,
58 | |         _myself: ActorRef<Self::Msg>,
59 | |         message: Self::Msg,
60 | |         state: &mut Self::State,
61 | |     ) -> Result<(), ActorProcessingErr> {
   | |_____^ lifetimes do not match method in trait

error[E0195]: lifetime parameters or bounds on method `post_stop` do not match the trait declaration
   --> src\actors\account.rs:123:14
    |
123 |       async fn post_stop(
    |  ______________^
124 | |         &self,
125 | |         _myself: ActorRef<Self::Msg>,
126 | |         state: &mut Self::State,
127 | |     ) -> Result<(), ActorProcessingErr> {
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

warning: unused variable: `name`
  --> src\managers\script_manager.rs:15:30
   |
15 |     pub fn get_script(&self, name: &str) -> Option<String> {
   |                              ^^^^ help: if this is intentional, prefix it with an underscore: `_name`

For more information about this error, try `rustc --explain E0195`.
warning: `teleflow-desktop` (lib) generated 11 warnings
error: could not compile `teleflow-desktop` (lib) due to 6 previous errors; 11 warnings emitted
