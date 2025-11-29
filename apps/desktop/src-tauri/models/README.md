# NLP Models Directory

This directory contains ONNX models for natural language processing.

## Current Models

### paraphrase-MiniLM-L6-v2

- **Purpose**: Text embedding and semantic similarity
- **Dimensions**: 384
- **Languages**: Multilingual (English, Chinese, etc.)
- **Size**: ~23 MB (ONNX format)
- **Source**: `sentence-transformers/paraphrase-MiniLM-L6-v2`

## Setup

To download and convert the model, run:

```bash
python ../../../scripts/download_nlp_model.py
```

## Directory Structure

```
models/
└── paraphrase-minilm-l6-v2/
    ├── model.onnx              # ONNX model file
    ├── config.json             # Model configuration
    └── tokenizer/
        ├── tokenizer.json      # Tokenizer configuration
        ├── tokenizer_config.json
        └── special_tokens_map.json
```

## Usage in Rust

```rust
use crate::ai::inference::CognitionService;

let cognition = CognitionService::new(
    "models/paraphrase-minilm-l6-v2/model.onnx",
    "models/paraphrase-minilm-l6-v2/tokenizer/tokenizer.json"
)?;

let embedding = cognition.encode("你好，世界！")?;
// Returns: Vec<f32> with 384 dimensions
```

## Notes

- Models are loaded lazily on first use
- Models are cached in memory for performance
- ONNX Runtime handles cross-platform compatibility
