-- Seed 'Empire Registration Guide' Workflow
INSERT INTO workflow_definitions (id, name, description, definition)
VALUES (
    'REG_GUIDE_V1',
    '帝国注册引导',
    '用于验收 PFSM 引擎的注册流程',
    '{
      "id": "REG_GUIDE_V1",
      "nodes": {
        "N1_AskEmail": {
          "id": "N1_AskEmail",
          "node_type": "SendMessage",
          "config": { "text": "欢迎！请回复您的邮箱地址。" }
        },
        "N2_WaitEmail": { "id": "N2_WaitEmail", "node_type": "WaitForReply", "config": {} },
        "N3_Success": {
          "id": "N3_Success",
          "node_type": "SendMessage",
          "config": { "text": "注册成功！" }
        },
        "N_Error_Email": {
           "id": "N_Error_Email",
           "node_type": "SendMessage",
           "config": { "text": "邮箱格式错误，请重试。" }
        }
      },
      "edges": [
        { "source_node_id": "N1_AskEmail", "target_node_id": "N2_WaitEmail", "condition": null },
        {
          "source_node_id": "N2_WaitEmail",
          "target_node_id": "N3_Success",
          "condition": { "match_type": "Regex", "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }
        },
        {
          "source_node_id": "N2_WaitEmail",
          "target_node_id": "N_Error_Email",
          "condition": { "match_type": "Fallback", "pattern": null }
        },
        { "source_node_id": "N_Error_Email", "target_node_id": "N2_WaitEmail", "condition": null }
      ]
    }'
);
