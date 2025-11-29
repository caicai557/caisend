#!/usr/bin/env python3
"""
NLP Model Download and Conversion Script

Downloads SentenceTransformers model and converts it to ONNX format
for use with ONNX Runtime in the Rust application.
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed."""
    required = ['sentence_transformers', 'optimum', 'onnxruntime']
    missing = []
    
    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print("❌ Missing required packages:")
        for pkg in missing:
            print(f"   - {pkg}")
        print("\nInstall with:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    return True

def download_and_convert_model():
    """Download and convert SentenceTransformers model to ONNX."""
    from sentence_transformers import SentenceTransformer
    from optimum.onnxruntime import ORTModelForFeatureExtraction
    from transformers import AutoTokenizer
    
    model_name = "sentence-transformers/paraphrase-MiniLM-L6-v2"
    output_dir = Path(__file__).parent.parent / "apps" / "desktop" / "src-tauri" / "models" / "paraphrase-minilm-l6-v2"
    
    print(f"📦 Downloading model: {model_name}")
    print(f"📁 Output directory: {output_dir}")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Download SentenceTransformers model
    print("\n⏳ Step 1/3: Downloading SentenceTransformers model...")
    model = SentenceTransformer(model_name)
    
    # Save tokenizer
    print("⏳ Step 2/3: Saving tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer_dir = output_dir / "tokenizer"
    tokenizer_dir.mkdir(exist_ok=True)
    tokenizer.save_pretrained(str(tokenizer_dir))
    
    # Export to ONNX using optimum
    print("⏳ Step 3/3: Converting to ONNX format...")
    
    # Get the base transformer model
    base_model_name = model_name
    ort_model = ORTModelForFeatureExtraction.from_pretrained(
        base_model_name,
        export=True
    )
    
    # Save ONNX model
    onnx_path = output_dir / "model.onnx"
    ort_model.save_pretrained(str(output_dir))
    
    # Move the model file if needed
    generated_model = output_dir / "model.onnx"
    if generated_model.exists():
        print(f"\n✅ Model successfully converted!")
        print(f"   ONNX model: {generated_model}")
        print(f"   Tokenizer: {tokenizer_dir}")
        
        # Get model size
        model_size_mb = generated_model.stat().st_size / (1024 * 1024)
        print(f"   Model size: {model_size_mb:.2f} MB")
        
        return True
    else:
        print("\n❌ Model conversion failed - model.onnx not found")
        return False

def main():
    """Main function."""
    print("=" * 60)
    print("NLP Model Download and Conversion")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Download and convert
    try:
        if download_and_convert_model():
            print("\n" + "=" * 60)
            print("✅ Success! Model is ready for use.")
            print("=" * 60)
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
