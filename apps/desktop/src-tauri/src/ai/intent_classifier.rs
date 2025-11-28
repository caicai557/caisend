use super::inference::CognitionService;
use super::intent::{IntentResult, intents};
use anyhow::Result;
use std::collections::HashMap;
use std::sync::Arc;

/// 意图分类器
/// 
/// 基于向量相似度的意图识别，支持自定义意图模板
pub struct IntentClassifier {
    cognition: Arc<CognitionService>,
    /// 意图模板：每个意图的代表性向量（平均多个样本）
    intent_templates: HashMap<String, Vec<f32>>,
}

impl IntentClassifier {
    /// 创建新的意图分类器
    pub fn new(cognition: Arc<CognitionService>) -> Self {
        Self {
            cognition,
            intent_templates: HashMap::new(),
        }
    }

    /// 添加意图模板
    /// 
    /// # Arguments
    /// * `label` - 意图标签
    /// * `examples` - 该意图的示例文本列表
    pub fn add_intent_template(&mut self, label: &str, examples: Vec<&str>) -> Result<()> {
        if examples.is_empty() {
            return Err(anyhow::anyhow!("Examples cannot be empty"));
        }

        // 计算所有示例的向量
        let mut embeddings = Vec::new();
        for example in examples {
            let embedding = self.cognition.encode(example)?;
            embeddings.push(embedding);
        }

        // 计算平均向量作为模板
        let template = Self::average_vectors(&embeddings)?;
        self.intent_templates.insert(label.to_string(), template);

        Ok(())
    }

    /// 识别文本意图
    /// 
    /// 返回置信度最高的意图，如果所有意图的相似度都很低，返回UNKNOWN
    pub fn classify(&self, text: &str) -> Result<IntentResult> {
        if self.intent_templates.is_empty() {
            return Ok(IntentResult::new(intents::UNKNOWN, 0.0));
        }

        // 获取输入文本的向量
        let input_embedding = self.cognition.encode(text)?;

        // 计算与每个意图模板的相似度
        let mut best_match = (intents::UNKNOWN.to_string(), 0.0f32);

        for (label, template) in &self.intent_templates {
            let similarity = Self::cosine_similarity(&input_embedding, template)?;
            if similarity > best_match.1 {
                best_match = (label.clone(), similarity);
            }
        }

        // 如果最高相似度太低，返回UNKNOWN
        if best_match.1 < 0.3 {
            Ok(IntentResult::new(intents::UNKNOWN, best_match.1))
        } else {
            Ok(IntentResult::new(best_match.0, best_match.1))
        }
    }

    /// 计算向量平均值
    fn average_vectors(vectors: &[Vec<f32>]) -> Result<Vec<f32>> {
        if vectors.is_empty() {
            return Err(anyhow::anyhow!("Cannot average empty vector list"));
        }

        let dim = vectors[0].len();
        let mut avg = vec![0.0; dim];

        for vector in vectors {
            if vector.len() != dim {
                return Err(anyhow::anyhow!("Vector dimension mismatch"));
            }
            for (i, &val) in vector.iter().enumerate() {
                avg[i] += val;
            }
        }

        let count = vectors.len() as f32;
        for val in &mut avg {
            *val /= count;
        }

        Ok(avg)
    }

    /// 计算余弦相似度
    fn cosine_similarity(a: &[f32], b: &[f32]) -> Result<f32> {
        if a.len() != b.len() {
            return Err(anyhow::anyhow!("Vector dimension mismatch"));
        }

        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_a == 0.0 || norm_b == 0.0 {
            return Ok(0.0);
        }

        Ok(dot_product / (norm_a * norm_b))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = IntentClassifier::cosine_similarity(&a, &b).unwrap();
        assert!((sim - 1.0).abs() < 0.001);

        let c = vec![1.0, 0.0, 0.0];
        let d = vec![0.0, 1.0, 0.0];
        let sim2 = IntentClassifier::cosine_similarity(&c, &d).unwrap();
        assert!((sim2 - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_average_vectors() {
        let vectors = vec![
            vec![1.0, 2.0, 3.0],
            vec![2.0, 3.0, 4.0],
        ];
        let avg = IntentClassifier::average_vectors(&vectors).unwrap();
        assert_eq!(avg, vec![1.5, 2.5, 3.5]);
    }
}
