use criterion::{black_box, criterion_group, criterion_main, Criterion};
use teleflow_desktop::domain::automation::RuleEngine;
use teleflow_desktop::domain::models::{Message, Rule};
use teleflow_desktop::state::AppState;
use teleflow_desktop::adapters::db::init_db;
use std::sync::Arc;
use tokio::runtime::Runtime;

fn benchmark_rule_evaluation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    // Setup
    let (engine, message) = rt.block_on(async {
        let db_pool = init_db("sqlite::memory:").await.unwrap();
        let app_state = Arc::new(AppState::new(db_pool.clone()));

        // Insert 100 keyword rules
        for i in 0..100 {
            sqlx::query!(
                r#"
                INSERT INTO rules (id, name, trigger_type, trigger_content, action_type, action_content, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
                format!("rule_{}", i), format!("Rule {}", i), "keyword", format!("keyword_{}", i), "reply", "Hi", true
            )
            .execute(&db_pool)
            .await
            .unwrap();
        }

        let mut engine = RuleEngine::new(app_state.clone());
        engine.load_rules().await.unwrap();

        let message = Message {
            id: "msg_bench".to_string(),
            conversation_id: "convo_bench".to_string(),
            sender_id: "remote_user".to_string(),
            content: "This message contains keyword_50 and keyword_99".to_string(),
            message_type: "text".to_string(),
            status: "received".to_string(),
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };

        (engine, message)
    });

    c.bench_function("evaluate_100_rules", |b| {
        b.to_async(&rt).iter(|| async {
            engine.evaluate(black_box(&message)).await;
        })
    });
}

criterion_group!(benches, benchmark_rule_evaluation);
criterion_main!(benches);
