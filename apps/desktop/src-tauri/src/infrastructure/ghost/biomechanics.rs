use rand::Rng;
use std::time::Duration;

pub struct HumanInput;

impl HumanInput {
    /// Generates a cubic Bezier curve for mouse movement
    /// Returns a list of (x, y) points
    pub fn generate_mouse_path(start: (f64, f64), end: (f64, f64), steps: usize) -> Vec<(f64, f64)> {
        let mut rng = rand::thread_rng();
        
        // Control points with some randomness to simulate human arc
        let ctrl1 = (
            start.0 + (end.0 - start.0) * 0.25 + rng.gen_range(-50.0..50.0),
            start.1 + (end.1 - start.1) * 0.25 + rng.gen_range(-50.0..50.0),
        );
        let ctrl2 = (
            start.0 + (end.0 - start.0) * 0.75 + rng.gen_range(-50.0..50.0),
            start.1 + (end.1 - start.1) * 0.75 + rng.gen_range(-50.0..50.0),
        );

        let mut path = Vec::with_capacity(steps);
        for i in 0..=steps {
            let t = i as f64 / steps as f64;
            let x = (1.0 - t).powi(3) * start.0
                + 3.0 * (1.0 - t).powi(2) * t * ctrl1.0
                + 3.0 * (1.0 - t) * t.powi(2) * ctrl2.0
                + t.powi(3) * end.0;
            let y = (1.0 - t).powi(3) * start.1
                + 3.0 * (1.0 - t).powi(2) * t * ctrl1.1
                + 3.0 * (1.0 - t) * t.powi(2) * ctrl2.1
                + t.powi(3) * end.1;
            path.push((x, y));
        }
        path
    }

    /// Calculates a human-like typing delay for a character
    pub fn get_typing_delay() -> Duration {
        let mut rng = rand::thread_rng();
        // Base WPM ~60-100, so ~100-200ms per keystroke + variance
        let base_ms = rng.gen_range(60..150); 
        Duration::from_millis(base_ms)
    }

    /// Calculates a "thinking" delay between actions
    pub fn get_thinking_delay() -> Duration {
        let mut rng = rand::thread_rng();
        Duration::from_millis(rng.gen_range(500..2000))
    }
}
