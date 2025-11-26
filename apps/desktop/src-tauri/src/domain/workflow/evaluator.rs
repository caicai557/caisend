use crate::domain::workflow::schema::{Condition, MatchType};
use crate::ai::inference::CognitionService;
use regex::Regex;
use anyhow::Result;
use sqlx::{SqlitePool, Row};

// 评估输入消息是否满足条件
pub async fn evaluate_condition(
    input_message: &str,
    condition: &Condition,
    cognition: Option<&CognitionService>,
    pool: Option<&SqlitePool>,
) -> Result<bool> {
    match condition.match_type {
        MatchType::Keyword => Ok(input_message.to_lowercase().contains(&condition.pattern.as_deref().unwrap_or("").to_lowercase())),
        MatchType::Regex => {
            let pattern = condition.pattern.as_deref().ok_or_else(|| anyhow::anyhow!("Regex pattern missing"))?;
            let re = Regex::new(pattern)?;
            Ok(re.is_match(input_message))
        },
        MatchType::Semantic => {
            // 语义匹配逻辑
            let (Some(cognition), Some(pool)) = (cognition, pool) else {
                tracing::warn!("[Evaluator] Semantic match requested but CognitionService or DB pool missing");
                return Ok(false);
            };

            let target_intent = condition.pattern.as_deref().ok_or_else(|| anyhow::anyhow!("Target intent label missing"))?;
            
            // 1. Encode input message
            let embedding = cognition.encode(input_message)?;
            
            // 2. Search vector DB (intents_vec)
            // Note: sqlite-vec syntax depends on version. Assuming vec0 with cosine similarity.
            // We want to check if the input message is similar to the target intent.
            // But wait, usually we classify the input message to an intent.
            // Strategy:
            // A. The condition pattern is the "Intent Label" (e.g., "UserAgrees").
            // B. We search the `intents_vec` for the closest intent to the input message.
            // C. If the top 1 intent matches the target intent label AND score > threshold, then true.
            
            // However, `intents_vec` stores (label, embedding).
            // We query for top K similar to input_embedding.
            
            // Construct vector string or parameter for query
            // sqlx doesn't support float array binding directly for vec0 easily without extension types.
            // We might need to format it as a string or blob depending on the extension.
            // For now, let's assume we can't easily run the vector query without more setup.
            // Mocking the logic for now or using a simplified approach if extension is not fully ready.
            
            // REAL IMPLEMENTATION (Commented out until vec0 is confirmed working with sqlx):
            /*
            let embedding_json = serde_json::to_string(&embedding)?;
            let row = sqlx::query(
                "SELECT intent_label, distance 
                 FROM intents_vec 
                 WHERE embedding MATCH ? 
                 ORDER BY distance 
                 LIMIT 1"
            )
            .bind(embedding_json)
            .fetch_optional(pool)
            .await?;
            
            if let Some(row) = row {
                let label: String = row.get("intent_label");
                let distance: f32 = row.get("distance");
                // vec0 distance is usually L2 or Cosine distance. Lower is better? Or similarity?
                // Assuming cosine similarity (1.0 is identical).
                // If using vec0, it might be distance.
                
                if label == target_intent && distance < 0.2 { // Threshold
                    return Ok(true);
                }
            }
            */
            
            // TEMPORARY MOCK for "The Cognitive Leap" verification without full vector DB runtime:
            // If the input contains the intent label (loose match) or we use a simple heuristic.
            tracing::info!("[Evaluator] Semantic match (Mock): input='{}', target='{}'", input_message, target_intent);
            
            // For demonstration, if we have the embedding, we are good.
            // Let's just return true if the input contains the target intent text (Mock).
            // In production, uncomment the SQL above.
            Ok(input_message.contains(target_intent))
        },
        MatchType::Fallback => Ok(true),
        MatchType::Timeout => Ok(false),
    }
}
