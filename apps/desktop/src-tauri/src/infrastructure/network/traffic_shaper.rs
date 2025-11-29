use rand_distr::{Distribution, Normal};
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct TrafficShaper {
    // Mean delay in milliseconds
    mean_delay_ms: f64,
    // Standard deviation in milliseconds
    std_dev_ms: f64,
}

impl Default for TrafficShaper {
    fn default() -> Self {
        Self {
            mean_delay_ms: 200.0, // Default 200ms delay
            std_dev_ms: 50.0,     // +/- 50ms variance
        }
    }
}

impl TrafficShaper {
    pub fn new(mean_delay_ms: f64, std_dev_ms: f64) -> Self {
        Self {
            mean_delay_ms,
            std_dev_ms,
        }
    }

    /// Calculate a random jitter delay based on normal distribution
    pub fn calculate_jitter(&self) -> Duration {
        let mut rng = rand::thread_rng();
        let normal = Normal::new(self.mean_delay_ms, self.std_dev_ms).unwrap_or_else(|_| {
            // Fallback if parameters are invalid
            Normal::new(200.0, 50.0).unwrap()
        });

        let delay_ms = normal.sample(&mut rng);
        // Ensure delay is non-negative
        let delay_ms = delay_ms.max(0.0);
        
        Duration::from_millis(delay_ms as u64)
    }

    /// Execute an action with pre-request jitter
    pub async fn execute_with_jitter<F, Fut, T>(&self, action: F) -> T
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = T>,
    {
        let delay = self.calculate_jitter();
        if !delay.is_zero() {
            sleep(delay).await;
        }
        action().await
    }
}
