use crate::actuator::service::{execute_click, execute_typing, get_screen_coordinates};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub enum AutomationTask {
    ClickSelector {
        account_id: String,
        selector: String,
    },
    Type {
        account_id: String,
        text: String,
    },
}

#[derive(Clone)]
pub struct FocusScheduler {
    sender: mpsc::Sender<AutomationTask>,
}

impl FocusScheduler {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel(100);
        tokio::spawn(Self::run_scheduler_loop(app, rx));
        Self { sender: tx }
    }

    /// 测试/无窗口场景使用的空实现，不会实际执行任务
    pub fn noop() -> Self {
        let (tx, _rx) = mpsc::channel(1);
        Self { sender: tx }
    }

    pub async fn submit(
        &self,
        task: AutomationTask,
    ) -> Result<(), mpsc::error::SendError<AutomationTask>> {
        self.sender.send(task).await
    }

    async fn run_scheduler_loop(app: AppHandle, mut receiver: mpsc::Receiver<AutomationTask>) {
        while let Some(task) = receiver.recv().await {
            let account_id = match &task {
                AutomationTask::ClickSelector { account_id, .. } => account_id,
                AutomationTask::Type { account_id, .. } => account_id,
            };

            let window_label = format!("account-{}", account_id);

            if let Some(window) = app.get_webview_window(&window_label) {
                // 焦点轮询序列
                let _ = window.unminimize();
                let _ = window.show();
                if let Err(err) = window.set_focus() {
                    eprintln!(
                        "FocusScheduler: failed to focus window for {}: {}",
                        account_id, err
                    );
                    continue;
                }

                tokio::time::sleep(Duration::from_millis(150)).await;

                match task {
                    AutomationTask::ClickSelector { selector, .. } => {
                        match get_screen_coordinates(&window, &selector).await {
                            Ok((x, y)) => execute_click(x, y).await,
                            Err(err) => eprintln!(
                                "FocusScheduler: coordinate error for {} -> {}",
                                selector, err
                            ),
                        }
                    }
                    AutomationTask::Type { text, .. } => {
                        execute_typing(&text).await;
                    }
                }

                tokio::time::sleep(Duration::from_millis(100)).await;
                let _ = window.minimize();
            } else {
                eprintln!(
                    "FocusScheduler: webview window not found for {}",
                    account_id
                );
            }
        }
    }
}
