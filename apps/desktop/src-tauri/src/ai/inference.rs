use anyhow::{Result, Context};
use ort::{GraphOptimizationLevel, Session};
use std::path::Path;
use std::sync::Arc;
use tokenizers::Tokenizer;

pub struct CognitionService {
    session: Session,
    tokenizer: Tokenizer,
}

impl CognitionService {
    pub fn new<P: AsRef<Path>>(model_path: P, tokenizer_path: P) -> Result<Self> {
        // Load Tokenizer
        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {}", e))?;

        // Load ONNX Model
        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(model_path)?;

        Ok(Self {
            session,
            tokenizer,
        })
    }

    /// Encode text to vector (embedding)
    pub fn encode(&self, text: &str) -> Result<Vec<f32>> {
        // 1. Tokenize
        let encoding = self.tokenizer.encode(text, true)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        let input_ids: Vec<i64> = encoding.get_ids().iter().map(|&x| x as i64).collect();
        let attention_mask: Vec<i64> = encoding.get_attention_mask().iter().map(|&x| x as i64).collect();
        let token_type_ids: Vec<i64> = encoding.get_type_ids().iter().map(|&x| x as i64).collect();

        let batch_size = 1;
        let sequence_length = input_ids.len();

        // 2. Prepare Inputs
        let input_ids_tensor = ort::Value::from_array(
            (vec![batch_size, sequence_length], input_ids.into_boxed_slice())
        )?;
        let attention_mask_tensor = ort::Value::from_array(
            (vec![batch_size, sequence_length], attention_mask.into_boxed_slice())
        )?;
        let token_type_ids_tensor = ort::Value::from_array(
            (vec![batch_size, sequence_length], token_type_ids.into_boxed_slice())
        )?;

        let inputs = ort::inputs![
            "input_ids" => input_ids_tensor,
            "attention_mask" => attention_mask_tensor,
            "token_type_ids" => token_type_ids_tensor
        ]?;

        // 3. Run Inference
        let outputs = self.session.run(inputs)?;
        
        // 4. Extract Embeddings (last_hidden_state)
        // Shape: [batch_size, sequence_length, hidden_size]
        // We usually take the CLS token (index 0) or mean pooling. 
        // For BGE models, CLS token is often used for classification/similarity.
        // Let's assume we want the CLS token embedding (first token).
        
        let output_tensor = outputs["last_hidden_state"].extract_tensor::<f32>()?;
        let shape = output_tensor.shape(); // [1, seq_len, 384]
        let hidden_size = shape[2];

        // Extract the first token (CLS) embedding [0, 0, :]
        let embedding: Vec<f32> = output_tensor.view()
            .as_slice()
            .unwrap()
            .iter()
            .take(hidden_size)
            .cloned()
            .collect();

        // Normalize (Cosine Similarity requires normalized vectors)
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized_embedding = embedding.iter().map(|x| x / norm).collect();

        Ok(normalized_embedding)
    }
}
