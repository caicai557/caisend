use chrono::{Local, Timelike};
use rand::Rng;

#[derive(Debug, Clone)]
pub struct CircadianRhythm {
    start_hour: u32,
    end_hour: u32,
    // Probability of being active during active hours (0.0 - 1.0)
    activity_probability: f64,
}

impl Default for CircadianRhythm {
    fn default() -> Self {
        Self {
            start_hour: 9, // 9 AM
            end_hour: 23,  // 11 PM
            activity_probability: 0.9,
        }
    }
}

impl CircadianRhythm {
    pub fn new(start_hour: u32, end_hour: u32) -> Self {
        Self {
            start_hour,
            end_hour,
            activity_probability: 0.9,
        }
    }

    pub fn should_be_active(&self) -> bool {
        let now = Local::now();
        let hour = now.hour();

        // Check if within active hours
        if hour >= self.start_hour && hour < self.end_hour {
            // Add some randomness so it's not perfectly continuous
            let mut rng = rand::thread_rng();
            return rng.gen_bool(self.activity_probability);
        }
        
        false
    }

    pub fn get_sleep_duration(&self) -> std::time::Duration {
        // If inactive, sleep for a while (e.g., 5-15 minutes) before checking again
        // or until start_hour if it's night time.
        // For simplicity, we return a short check interval.
        std::time::Duration::from_secs(60 * 5)
    }
}
