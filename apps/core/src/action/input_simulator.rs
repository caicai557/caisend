//! Input Simulator - Human-like typing and mouse movement
//!
//! Implements Bézier curves for mouse and Gaussian delays for typing.

use rand::Rng;
use rand_distr::{Distribution, Normal};
use std::time::Duration;

/// Configuration for human-like typing simulation
#[derive(Debug, Clone)]
pub struct TypingConfig {
    /// Mean delay between keystrokes (ms)
    pub mean_delay_ms: f64,
    /// Standard deviation for keystroke delay (ms)
    pub std_dev_ms: f64,
    /// Probability of making a typo (0.0 - 1.0)
    pub typo_probability: f64,
    /// Probability of pausing mid-typing (0.0 - 1.0)
    pub pause_probability: f64,
    /// Mean pause duration (ms)
    pub mean_pause_ms: f64,
}

impl Default for TypingConfig {
    fn default() -> Self {
        Self {
            mean_delay_ms: 80.0,
            std_dev_ms: 25.0,
            typo_probability: 0.02,
            pause_probability: 0.05,
            mean_pause_ms: 500.0,
        }
    }
}

/// Generate a sequence of keystroke delays using Gaussian distribution
pub fn generate_keystroke_delays(text: &str, config: &TypingConfig) -> Vec<Duration> {
    let mut rng = rand::thread_rng();
    let normal = Normal::new(config.mean_delay_ms, config.std_dev_ms)
        .unwrap_or_else(|_| Normal::new(80.0, 25.0).unwrap());
    
    let mut delays = Vec::with_capacity(text.len());
    
    for _ in text.chars() {
        // Base delay from Gaussian distribution
        let mut delay_ms = normal.sample(&mut rng).max(20.0); // Minimum 20ms
        
        // Random pause simulation
        if rng.gen::<f64>() < config.pause_probability {
            delay_ms += rng.gen::<f64>() * config.mean_pause_ms;
        }
        
        delays.push(Duration::from_millis(delay_ms as u64));
    }
    
    delays
}

/// A point in 2D space
#[derive(Debug, Clone, Copy)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

/// Generate a Bézier curve path between two points
/// 
/// Returns a sequence of points that simulate human-like mouse movement.
pub fn generate_bezier_path(start: Point, end: Point, steps: usize) -> Vec<Point> {
    let mut rng = rand::thread_rng();
    
    // Generate two random control points for a cubic Bézier curve
    let ctrl1 = Point {
        x: start.x + (end.x - start.x) * 0.25 + rng.gen::<f64>() * 50.0 - 25.0,
        y: start.y + (end.y - start.y) * 0.25 + rng.gen::<f64>() * 50.0 - 25.0,
    };
    let ctrl2 = Point {
        x: start.x + (end.x - start.x) * 0.75 + rng.gen::<f64>() * 50.0 - 25.0,
        y: start.y + (end.y - start.y) * 0.75 + rng.gen::<f64>() * 50.0 - 25.0,
    };
    
    let mut path = Vec::with_capacity(steps);
    
    for i in 0..=steps {
        let t = i as f64 / steps as f64;
        
        // Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        let one_minus_t = 1.0 - t;
        let point = Point {
            x: one_minus_t.powi(3) * start.x
                + 3.0 * one_minus_t.powi(2) * t * ctrl1.x
                + 3.0 * one_minus_t * t.powi(2) * ctrl2.x
                + t.powi(3) * end.x,
            y: one_minus_t.powi(3) * start.y
                + 3.0 * one_minus_t.powi(2) * t * ctrl1.y
                + 3.0 * one_minus_t * t.powi(2) * ctrl2.y
                + t.powi(3) * end.y,
        };
        
        // Add tiny noise for even more human-like movement
        let noisy_point = Point {
            x: point.x + rng.gen::<f64>() * 2.0 - 1.0,
            y: point.y + rng.gen::<f64>() * 2.0 - 1.0,
        };
        
        path.push(noisy_point);
    }
    
    path
}

/// Generate realistic delays between mouse movement steps
pub fn generate_movement_delays(step_count: usize) -> Vec<Duration> {
    let mut rng = rand::thread_rng();
    let normal: Normal<f64> = Normal::new(10.0, 3.0).unwrap();
    
    (0..step_count)
        .map(|_| {
            let sample: f64 = normal.sample(&mut rng);
            let delay_ms = if sample > 5.0 { sample } else { 5.0 };
            Duration::from_millis(delay_ms as u64)
        })
        .collect()
}

/// Calculate a realistic click delay after reaching target
pub fn generate_click_delay() -> Duration {
    let mut rng = rand::thread_rng();
    let delay_ms = 50.0 + rng.gen::<f64>() * 150.0; // 50-200ms
    Duration::from_millis(delay_ms as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keystroke_delays() {
        let config = TypingConfig::default();
        let text = "Hello, World!";
        let delays = generate_keystroke_delays(text, &config);
        
        assert_eq!(delays.len(), text.len());
        
        // All delays should be positive
        assert!(delays.iter().all(|d| d.as_millis() >= 20));
        
        // Average should be close to mean (within reason)
        let avg_ms: f64 = delays.iter().map(|d| d.as_millis() as f64).sum::<f64>() / delays.len() as f64;
        assert!(avg_ms > 30.0 && avg_ms < 300.0);
        
        println!("✅ Keystroke delays test passed (avg: {:.1}ms)", avg_ms);
    }

    #[test]
    fn test_bezier_path() {
        let start = Point::new(100.0, 100.0);
        let end = Point::new(500.0, 400.0);
        let path = generate_bezier_path(start, end, 20);
        
        assert_eq!(path.len(), 21); // steps + 1
        
        // First point should be near start
        assert!((path[0].x - start.x).abs() < 2.0);
        assert!((path[0].y - start.y).abs() < 2.0);
        
        // Last point should be near end
        let last = path.last().unwrap();
        assert!((last.x - end.x).abs() < 2.0);
        assert!((last.y - end.y).abs() < 2.0);
        
        println!("✅ Bézier path test passed ({} points)", path.len());
    }
}
