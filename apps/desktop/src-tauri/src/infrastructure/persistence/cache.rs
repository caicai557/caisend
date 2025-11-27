use moka::future::Cache;
use std::hash::Hash;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Clone)]
pub struct CacheManager<K, V>
where
    K: Hash + Eq + Send + Sync + 'static + Clone,
    V: Send + Sync + 'static + Clone,
{
    cache: Cache<K, V>,
    dirty_tx: mpsc::Sender<(K, V)>,
}

impl<K, V> CacheManager<K, V>
where
    K: Hash + Eq + Send + Sync + 'static + Clone + std::fmt::Debug,
    V: Send + Sync + 'static + Clone + std::fmt::Debug,
{
    pub fn new(capacity: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(capacity)
            .time_to_live(Duration::from_secs(3600)) // 1 hour TTL
            .build();

        let (dirty_tx, mut dirty_rx) = mpsc::channel(1000);

        // Spawn Write-Behind flusher
        tokio::spawn(async move {
            tracing::info!("[Cache] Write-Behind flusher started");
            while let Some((key, value)) = dirty_rx.recv().await {
                // In a real implementation, this would batch writes or write to DB
                // For MVP, we just simulate the async write
                tracing::debug!("[Cache] Flushing dirty entry: {:?} -> {:?}", key, value);
                // TODO: Inject DB repository and write here
            }
        });

        Self { cache, dirty_tx }
    }

    pub async fn get(&self, key: &K) -> Option<V> {
        self.cache.get(key).await
    }

    pub async fn put(&self, key: K, value: V) {
        // 1. Update Cache (Fast path)
        self.cache.insert(key.clone(), value.clone()).await;

        // 2. Mark Dirty (Async write-behind)
        if let Err(e) = self.dirty_tx.send((key, value)).await {
            tracing::error!("[Cache] Failed to queue dirty entry: {}", e);
        }
    }

    /// Populate cache without triggering write-behind (for Read-Through)
    pub async fn populate(&self, key: K, value: V) {
        self.cache.insert(key, value).await;
    }

    pub async fn invalidate(&self, key: &K) {
        self.cache.invalidate(key).await;
    }
}
