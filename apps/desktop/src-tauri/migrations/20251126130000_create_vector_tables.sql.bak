-- Phase 4: Vector Compass (Intents)
-- Requires sqlite-vec extension

-- 意图向量表 (Virtual Table using vec0)
-- Note: sqlite-vec syntax might vary. Assuming standard vec0 usage.
-- If vec0 is not available, we might need to use a standard table with blob and manual cosine similarity (slow but works for small datasets).
-- Given the requirement "ensure sqlite-vec extension is integrated", we assume it's available.

CREATE VIRTUAL TABLE IF NOT EXISTS intents_vec USING vec0(
    intent_label TEXT PRIMARY KEY,
    embedding float[384]  -- Assuming BGE-small dimension is 384
);

-- Seed some basic intents
-- Note: We cannot easily seed vectors in SQL without the model. 
-- We will seed this via application logic or a separate script.
