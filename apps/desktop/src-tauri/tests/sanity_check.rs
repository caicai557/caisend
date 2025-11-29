use teleflow_desktop_lib::adapters::browser::cdp_adapter::CdpManager;
use std::sync::Arc;

#[tokio::test]
async fn test_sanity() {
    let _ = Arc::new(CdpManager::new_mock());
    assert!(true);
}
