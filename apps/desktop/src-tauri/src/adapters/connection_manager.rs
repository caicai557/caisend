use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::adapters::cdp::CdpClient;
use anyhow::Result;

pub struct ConnectionManager {
    clients: HashMap<String, Arc<CdpClient>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            clients: HashMap::new(),
        }
    }

    pub fn add_client(&mut self, account_id: String, client: CdpClient) {
        self.clients.insert(account_id, Arc::new(client));
    }

    pub fn get_client(&self, account_id: &str) -> Option<Arc<CdpClient>> {
        self.clients.get(account_id).cloned()
    }

    pub fn remove_client(&mut self, account_id: &str) {
        self.clients.remove(account_id);
    }
}
