-- 迁移：添加工作流额外字段和验证表
ALTER TABLE workflow_definitions ADD COLUMN description TEXT;
ALTER TABLE workflow_definitions ADD COLUMN is_active BOOLEAN DEFAULT 0;

-- 创建工作流验证报告表（可选，用于存储历史验证记录）
CREATE TABLE IF NOT EXISTS workflow_validation_reports (
    id TEXT PRIMARY KEY NOT NULL,
    workflow_id TEXT NOT NULL,
    errors TEXT, -- JSON array
    warnings TEXT, -- JSON array
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id)
);
