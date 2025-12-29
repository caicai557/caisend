//! Performance Benchmarks for Teleflow Core
//!
//! Run with: cargo test --release benchmark -- --nocapture

use std::time::{Duration, Instant};
use teleflow_core::intelligence::intent::IntentClassifier;
use teleflow_core::intelligence::keywords::KeywordMatcher;
use teleflow_core::action::input_simulator::{generate_bezier_path, generate_keystroke_delays, Point, TypingConfig};

/// Benchmark the keyword matcher performance
#[test]
fn benchmark_keyword_matcher() {
    let matcher = KeywordMatcher::new();
    let test_messages = vec![
        "Yes, I'm interested!",
        "No thanks, not for me",
        "How much does it cost?",
        "Hello, nice to meet you",
        "STOP sending messages",
        "好的，没问题",
        "不需要，谢谢",
        "This is a random message with no keywords",
    ];
    
    let iterations = 10000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        for msg in &test_messages {
            let _ = matcher.classify(msg);
        }
    }
    
    let elapsed = start.elapsed();
    let ops_per_sec = (iterations * test_messages.len()) as f64 / elapsed.as_secs_f64();
    let avg_ns = elapsed.as_nanos() / (iterations * test_messages.len()) as u128;
    
    println!("\n📊 Keyword Matcher Benchmark:");
    println!("   Total iterations: {}", iterations * test_messages.len());
    println!("   Total time: {:?}", elapsed);
    println!("   Avg per classification: {} ns", avg_ns);
    println!("   Throughput: {:.0} ops/sec", ops_per_sec);
    
    // Performance requirement: < 1ms per classification
    assert!(avg_ns < 1_000_000, "Classification too slow: {} ns > 1ms", avg_ns);
    println!("   ✅ PASSED: < 1ms per classification");
}

/// Benchmark the intent classifier (multi-layer)
#[test]
fn benchmark_intent_classifier() {
    let classifier = IntentClassifier::new();
    let test_messages = vec![
        "Yep, sounds good to me",
        "What's the price for this?",
        "How can I unsubscribe?",
        "这个多少钱？",
        "Random text without clear intent",
    ];
    
    let iterations = 5000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        for msg in &test_messages {
            let _ = classifier.classify(msg);
        }
    }
    
    let elapsed = start.elapsed();
    let ops_per_sec = (iterations * test_messages.len()) as f64 / elapsed.as_secs_f64();
    let avg_ns = elapsed.as_nanos() / (iterations * test_messages.len()) as u128;
    
    println!("\n📊 Intent Classifier Benchmark:");
    println!("   Total iterations: {}", iterations * test_messages.len());
    println!("   Total time: {:?}", elapsed);
    println!("   Avg per classification: {} ns", avg_ns);
    println!("   Throughput: {:.0} ops/sec", ops_per_sec);
    
    // Performance requirement: < 5ms per classification
    assert!(avg_ns < 5_000_000, "Classification too slow: {} ns > 5ms", avg_ns);
    println!("   ✅ PASSED: < 5ms per classification");
}

/// Benchmark Bezier path generation
#[test]
fn benchmark_bezier_path() {
    let iterations = 10000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        let start_pt = Point::new(100.0, 100.0);
        let end_pt = Point::new(500.0, 400.0);
        let _ = generate_bezier_path(start_pt, end_pt, 25);
    }
    
    let elapsed = start.elapsed();
    let ops_per_sec = iterations as f64 / elapsed.as_secs_f64();
    let avg_us = elapsed.as_micros() / iterations as u128;
    
    println!("\n📊 Bezier Path Benchmark:");
    println!("   Total iterations: {}", iterations);
    println!("   Total time: {:?}", elapsed);
    println!("   Avg per path: {} µs", avg_us);
    println!("   Throughput: {:.0} paths/sec", ops_per_sec);
    
    // Performance requirement: < 1ms per path
    assert!(avg_us < 1000, "Path generation too slow: {} µs > 1ms", avg_us);
    println!("   ✅ PASSED: < 1ms per path");
}

/// Benchmark typing delay generation
#[test]
fn benchmark_typing_delays() {
    let config = TypingConfig::default();
    let text = "Hello, this is a test message for benchmarking the typing delay generator functionality.";
    
    let iterations = 10000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        let _ = generate_keystroke_delays(text, &config);
    }
    
    let elapsed = start.elapsed();
    let ops_per_sec = iterations as f64 / elapsed.as_secs_f64();
    let avg_us = elapsed.as_micros() / iterations as u128;
    
    println!("\n📊 Typing Delays Benchmark:");
    println!("   Text length: {} chars", text.len());
    println!("   Total iterations: {}", iterations);
    println!("   Total time: {:?}", elapsed);
    println!("   Avg per generation: {} µs", avg_us);
    println!("   Throughput: {:.0} ops/sec", ops_per_sec);
    
    // Performance requirement: < 1ms per generation
    assert!(avg_us < 1000, "Delay generation too slow: {} µs > 1ms", avg_us);
    println!("   ✅ PASSED: < 1ms per generation");
}

/// Summary benchmark
#[test]
fn benchmark_summary() {
    println!("\n");
    println!("═══════════════════════════════════════════════════════════════");
    println!("                 TELEFLOW PERFORMANCE SUMMARY");
    println!("═══════════════════════════════════════════════════════════════");
    println!("");
    println!("All benchmarks run in release mode with optimizations enabled.");
    println!("Requirements: All operations < 5ms for smooth real-time response.");
    println!("");
    println!("Run individual benchmarks above for detailed metrics.");
    println!("═══════════════════════════════════════════════════════════════");
}
