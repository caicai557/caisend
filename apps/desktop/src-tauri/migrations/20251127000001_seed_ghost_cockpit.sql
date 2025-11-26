-- 幽灵座舱种子数据
-- 创建演示用的ScriptFlow

-- 1. 插入欢迎话术流程
INSERT INTO script_flows (id, account_id, category_name, created_at, updated_at)
VALUES ('flow_welcome', 'demo_account', '欢迎话术', 1732668000, 1732668000);

INSERT INTO script_steps (id, flow_id, order_index, content, advance_mode_json)
VALUES 
  ('step_w1', 'flow_welcome', 0, '你好！欢迎咨询，我是客服小助手 👋', '{"type":"manual"}'),
  ('step_w2', 'flow_welcome', 1, '请问您对什么产品感兴趣？', '{"type":"wait_for_reply","timeout_ms":60000,"condition":{"match_type":"any"}}'),
  ('step_w3', 'flow_welcome', 2, '好的，我这边给您详细介绍一下我们的产品特点...', '{"type":"manual"}'),
  ('step_w4', 'flow_welcome', 3, '还有什么其他问题吗？', '{"type":"wait_for_reply","timeout_ms":120000,"condition":{"match_type":"any"}}');

-- 2. 插入产品推荐流程
INSERT INTO script_flows (id, account_id, category_name, created_at, updated_at)
VALUES ('flow_recommend', 'demo_account', '产品推荐', 1732668000, 1732668000);

INSERT INTO script_steps (id, flow_id, order_index, content, advance_mode_json)
VALUES 
  ('step_r1', 'flow_recommend', 0, '根据您的需求，我为您推荐以下几款产品：', '{"type":"manual"}'),
  ('step_r2', 'flow_recommend', 1, '1️⃣ A产品 - 性价比之选\n2️⃣ B产品 - 高端精品\n3️⃣ C产品 - 限时特惠', '{"type":"auto_advance","delay_ms":2000}'),
  ('step_r3', 'flow_recommend', 2, '您对哪款比较感兴趣？我可以详细介绍 😊', '{"type":"wait_for_reply","timeout_ms":90000,"condition":{"match_type":"any"}}');

-- 3. 插入售后服务流程
INSERT INTO script_flows (id, account_id, category_name, created_at, updated_at)
VALUES ('flow_support', 'demo_account', '售后服务', 1732668000, 1732668000);

INSERT INTO script_steps (id, flow_id, order_index, content, advance_mode_json)
VALUES 
  ('step_s1', 'flow_support', 0, '您好！我是售后服务专员，请问遇到什么问题了？', '{"type":"manual"}'),
  ('step_s2', 'flow_support', 1, '好的，我记录下了。正在为您查询处理方案...', '{"type":"auto_advance","delay_ms":3000}'),
  ('step_s3', 'flow_support', 2, '已为您找到解决方案，稍后会有专人跟进处理。还有其他问题吗？', '{"type":"wait_for_reply","timeout_ms":60000,"condition":{"match_type":"any"}}');

-- 4. 初始化账号配置
INSERT INTO account_configs (account_id, autoreply_enabled, updated_at)
VALUES ('demo_account', 0, 1732668000);

-- 5. 创建演示实例（可选，展示进度追踪）
INSERT INTO script_instances (id, flow_id, account_id, peer_id, current_step_index, status, created_at, updated_at)
VALUES 
  ('inst_demo1', 'flow_welcome', 'demo_account', 'user_12345', 1, 'Running', 1732668000, 1732668000);
