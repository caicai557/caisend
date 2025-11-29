use teleflow_desktop_lib::actors::account::{AccountActor, AccountConfig, AccountMessage};
use teleflow_desktop_lib::actors::supervisor::{SystemSupervisor, SupervisorMessage};
use teleflow_desktop_lib::adapters::browser::cdp_adapter::CdpManager;
use teleflow_desktop_lib::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use teleflow_desktop_lib::domain::lifecycle::LifecycleStatus;
use ractor::Actor;
use std::sync::Arc;
use std::time::Duration;

#[tokio::test]
async fn test_dashboard_aggregation() {
    println!("Starting test...");
    // 1. Setup dependencies
    println!("Creating CdpManager...");
    let cdp_manager = Arc::new(CdpManager::new_mock());
    println!("CdpManager created.");

    println!("Creating BehaviorTreeRepository...");
    let bt_repo = Arc::new(BehaviorTreeRepository::new_mock()); 
    println!("BehaviorTreeRepository created.");

    // 2. Spawn Supervisor
    let (supervisor, _) = Actor::spawn(
        Some("system-supervisor".to_string()),
        SystemSupervisor,
        (cdp_manager, bt_repo)
    ).await.expect("Failed to spawn supervisor");

    // 3. Spawn a few accounts via Supervisor
    for i in 0..3 {
        let config = AccountConfig {
            account_id: format!("test_account_{}", i),
            proxy: None,
            user_agent: None,
        };
        supervisor.cast(SupervisorMessage::SpawnAccount { config }).expect("Failed to spawn account");
    }

    // Wait for actors to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    // 4. Update one account's lifecycle status
    // We need to get the account ref first
    let (tx, rx) = tokio::sync::oneshot::channel();
    supervisor.cast(SupervisorMessage::GetAccount("test_account_0".to_string(), tx)).unwrap();
    if let Some(account) = rx.await.unwrap() {
        account.cast(AccountMessage::SetLifecycleStatus(LifecycleStatus::Active)).unwrap();
    }

    // Wait for status update
    tokio::time::sleep(Duration::from_millis(50)).await;

    // 5. Query System Status
    let status = ractor::call!(supervisor, SupervisorMessage::GetSystemStatus)
        .expect("Failed to call GetSystemStatus");
        // .expect("Failed to get system status"); // ractor::call returns Result<T, CallErr>, T is SystemStatus (not Result)

    // 6. Verify
    println!("System Status: {:?}", status);
    assert_eq!(status.total_accounts, 3);
    assert_eq!(status.online_count, 3);
    
    // Check lifecycle distribution
    // 1 Active, 2 Login (default)
    assert_eq!(status.lifecycle_distribution.get("active"), Some(&1));
    assert_eq!(status.lifecycle_distribution.get("login"), Some(&2));
}
