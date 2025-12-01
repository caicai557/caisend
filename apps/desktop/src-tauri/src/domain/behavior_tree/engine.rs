use super::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use super::state::{BehaviorTreeInstance, NodeStatus, NodeRuntimeState, TreeStatus};
use anyhow::Result;
use chrono::Utc;
use async_trait::async_trait;

/// 上下文接口，允许 PBT 节点与外部世界交互
#[async_trait]
pub trait ActionContext: Send + Sync {
    async fn execute_action(&self, action_type: &str, params: &serde_json::Value) -> Result<NodeStatus>;
    
    /// 检测文本意图
    async fn detect_intent(&self, text: &str) -> Result<crate::ai::IntentResult>;
}

pub struct BehaviorTreeEngine;

impl BehaviorTreeEngine {
    /// 执行一次 Tick
    /// 返回值: (TreeStatus, executed_nodes_count)
    pub async fn tick(
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<TreeStatus> {
        // 如果树已经结束，直接返回
        if instance.status == TreeStatus::Completed || instance.status == TreeStatus::Failed {
            return Ok(instance.status.clone());
        }

        let root_id = &definition.root_node_id;
        let root_status = Self::execute_node(root_id, instance, definition, context).await?;

        // 更新树的最终状态
        match root_status {
            NodeStatus::Success => {
                instance.status = TreeStatus::Completed;
                instance.updated_at = Utc::now();
            }
            NodeStatus::Failure => {
                instance.status = TreeStatus::Failed;
                instance.updated_at = Utc::now();
            }
            NodeStatus::Running => {
                instance.status = TreeStatus::Running;
                instance.updated_at = Utc::now();
            }
            NodeStatus::Skipped => {
                // Should not happen for root
                instance.status = TreeStatus::Completed;
            }
        }

        Ok(instance.status.clone())
    }

    #[async_recursion::async_recursion]
    async fn execute_node(
        node_id: &str,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let node = definition
            .nodes
            .get(node_id)
            .ok_or_else(|| anyhow::anyhow!("Node not found: {}", node_id))?;

        // 检查节点是否处于 Running 状态 (恢复执行)
        // 注意：这里简化处理，对于 Composite 节点，我们需要重新遍历子节点，
        // 但会根据子节点的 Running 状态跳过已成功的节点 (Sequence) 或继续尝试 (Selector)
        
        let status = match node.node_type {
            BtNodeType::Sequence => Self::execute_sequence(node, instance, definition, context).await?,
            BtNodeType::Selector => Self::execute_selector(node, instance, definition, context).await?,
            BtNodeType::RandomSelector => Self::execute_random_selector(node, instance, definition, context).await?,
            BtNodeType::Parallel => Self::execute_parallel(node, instance, definition, context).await?,
            BtNodeType::Action => Self::execute_action(node, instance, context).await?,
            BtNodeType::Condition => Self::execute_condition(node, instance)?,
            BtNodeType::Wait => Self::execute_wait(node, instance)?,
            BtNodeType::Inverter => Self::execute_inverter(node, instance, definition, context).await?,
            BtNodeType::Repeater => Self::execute_repeater(node, instance, definition, context).await?,
            BtNodeType::Retry => Self::execute_retry(node, instance, definition, context).await?,
            BtNodeType::ForceSuccess => Self::execute_force_success(node, instance, definition, context).await?,
            BtNodeType::ForceFailure => Self::execute_force_failure(node, instance, definition, context).await?,
            BtNodeType::UntilSuccess => Self::execute_until_success(node, instance, definition, context).await?,
            BtNodeType::UntilFailure => Self::execute_until_failure(node, instance, definition, context).await?,
            BtNodeType::Timeout => Self::execute_timeout(node, instance, definition, context).await?,
            BtNodeType::RateLimiter => Self::execute_rate_limiter(node, instance, definition, context).await?,
            _ => NodeStatus::Success, // 暂不支持的节点默认成功
        };

        // 更新节点状态记录
        if status == NodeStatus::Running {
            // 如果已经在运行，不要覆盖上下文，除非需要更新
            // 这里我们假设具体的 execute_* 函数已经维护了 context (如 execute_wait)
            // 所以这里只需要确保 entry 存在
            if !instance.node_states.contains_key(node_id) {
                 instance.node_states.insert(
                    node_id.to_string(),
                    NodeRuntimeState {
                        status: NodeStatus::Running,
                        context: serde_json::json!({}),
                    },
                );
            }
        } else {
            // 如果节点结束 (Success/Failure)，移除 Running 状态
            instance.node_states.remove(node_id);
        }

        Ok(status)
    }

    async fn execute_sequence(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        for child_id in &node.children {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;

            match child_status {
                NodeStatus::Running => return Ok(NodeStatus::Running),
                NodeStatus::Failure => return Ok(NodeStatus::Failure),
                NodeStatus::Success => continue, // 继续下一个
                NodeStatus::Skipped => continue,
            }
        }
        Ok(NodeStatus::Success)
    }

    async fn execute_selector(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        for child_id in &node.children {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;

            match child_status {
                NodeStatus::Running => return Ok(NodeStatus::Running),
                NodeStatus::Success => return Ok(NodeStatus::Success),
                NodeStatus::Failure => continue, // 尝试下一个
                NodeStatus::Skipped => continue,
            }
        }
        Ok(NodeStatus::Failure)
    }

    async fn execute_action(
        node: &BtNode, 
        instance: &mut BehaviorTreeInstance,
        context: &impl ActionContext
    ) -> Result<NodeStatus> {
        let action_type = node.config.get("action_type").and_then(|v| v.as_str()).unwrap_or("unknown");
        
        // 特殊处理 DetectIntent 动作
        if action_type == "DetectIntent" {
            let text = node.config.get("text")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("DetectIntent: missing 'text' parameter"))?;
            
            let result = context.detect_intent(text).await?;
            
            // 将意图检测结果写入blackboard
            instance.blackboard.set("detected_intent".to_string(), serde_json::json!(result.label));
            instance.blackboard.set("intent_confidence".to_string(), serde_json::json!(result.confidence));
            
            tracing::info!("[PBT] DetectIntent: {} (confidence: {})", result.label, result.confidence);
            
            return Ok(NodeStatus::Success);
        }
        
        // 其他动作委托给context处理
        context.execute_action(action_type, &node.config).await
    }

    fn execute_condition(node: &BtNode, instance: &mut BehaviorTreeInstance) -> Result<NodeStatus> {
        let condition_type = node.config.get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("generic");
        
        match condition_type {
            "intent_match" => Self::check_intent_match(node, instance),
            "generic" | _ => Self::check_generic_condition(node, instance),
        }
    }
    
    /// 检查意图匹配条件
    fn check_intent_match(node: &BtNode, instance: &BehaviorTreeInstance) -> Result<NodeStatus> {
        // 从blackboard获取检测到的意图
        let detected_intent = instance.blackboard.get("detected_intent")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        
        let expected_intent = node.config.get("expected_intent")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("IntentMatch: missing 'expected_intent'"))?;
        
        let confidence_threshold = node.config.get("confidence_threshold")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.7) as f32;
        
        let detected_confidence = instance.blackboard.get("intent_confidence")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0) as f32;
        
        if detected_intent == expected_intent && detected_confidence >= confidence_threshold {
            tracing::debug!("[PBT] IntentMatch SUCCESS: {} ({})", expected_intent, detected_confidence);
            Ok(NodeStatus::Success)
        } else {
            tracing::debug!("[PBT] IntentMatch FAILURE: expected={}, detected={} ({})", 
                expected_intent, detected_intent, detected_confidence);
            Ok(NodeStatus::Failure)
        }
    }
    
    /// 检查通用条件（原有逻辑）
    fn check_generic_condition(node: &BtNode, instance: &BehaviorTreeInstance) -> Result<NodeStatus> {
        // 简单的条件检查：读取 Blackboard
        let key = node.config.get("key").and_then(|v| v.as_str());
        let expected = node.config.get("value");

        if let (Some(k), Some(v)) = (key, expected) {
            if let Some(actual) = instance.blackboard.get(k) {
                if actual == v {
                    return Ok(NodeStatus::Success);
                }
            }
            return Ok(NodeStatus::Failure);
        }

        Ok(NodeStatus::Success) // 默认通过
    }

    fn execute_wait(node: &BtNode, instance: &mut BehaviorTreeInstance) -> Result<NodeStatus> {
        // 检查是否已经在等待
        if let Some(state) = instance.node_states.get(&node.id) {
            // 检查时间是否到达
            let start_time_str = state.context.get("start_time").and_then(|v| v.as_str());
            if let Some(start_time_str) = start_time_str {
                if let Ok(start_time) = chrono::DateTime::parse_from_rfc3339(start_time_str) {
                    let duration_ms = node.config.get("duration_ms").and_then(|v| v.as_u64()).unwrap_or(1000);
                    let now = Utc::now();
                    if now.signed_duration_since(start_time).num_milliseconds() >= duration_ms as i64 {
                        return Ok(NodeStatus::Success);
                    } else {
                        return Ok(NodeStatus::Running);
                    }
                }
            }
        }

        // 首次进入等待
        instance.node_states.insert(
            node.id.clone(),
            NodeRuntimeState {
                status: NodeStatus::Running,
                context: serde_json::json!({
                    "start_time": Utc::now().to_rfc3339()
                }),
            },
        );
        
        Ok(NodeStatus::Running)
    }

    // ============ 新增装饰节点 ============

    async fn execute_force_success(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        if let Some(child_id) = node.children.first() {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            match child_status {
                NodeStatus::Running => Ok(NodeStatus::Running),
                _ => Ok(NodeStatus::Success),
            }
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_timeout(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let timeout_ms = node.config.get("timeout_ms").and_then(|v| v.as_u64()).unwrap_or(5000);
        
        if let Some(state) = instance.node_states.get(&node.id) {
            let start_time_str = state.context.get("start_time").and_then(|v| v.as_str());
            if let Some(start_time_str) = start_time_str {
                if let Ok(start_time) = chrono::DateTime::parse_from_rfc3339(start_time_str) {
                    let now = Utc::now();
                    if now.signed_duration_since(start_time).num_milliseconds() >= timeout_ms as i64 {
                        instance.node_states.remove(&node.id);
                        return Ok(NodeStatus::Failure);
                    }
                }
            }
        } else {
            instance.node_states.insert(
                node.id.clone(),
                NodeRuntimeState {
                    status: NodeStatus::Running,
                    context: serde_json::json!({ "start_time": Utc::now().to_rfc3339() }),
                },
            );
        }

        if let Some(child_id) = node.children.first() {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            match child_status {
                NodeStatus::Running => Ok(NodeStatus::Running),
                _ => {
                    instance.node_states.remove(&node.id);
                    Ok(child_status)
                }
            }
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_rate_limiter(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let min_interval_ms = node.config.get("min_interval_ms").and_then(|v| v.as_u64()).unwrap_or(1000);
        
        if let Some(state) = instance.node_states.get(&node.id) {
            let last_exec_str = state.context.get("last_execution").and_then(|v| v.as_str());
            if let Some(last_exec_str) = last_exec_str {
                if let Ok(last_exec) = chrono::DateTime::parse_from_rfc3339(last_exec_str) {
                    let now = Utc::now();
                    let elapsed = now.signed_duration_since(last_exec).num_milliseconds();
                    if elapsed < min_interval_ms as i64 {
                        return Ok(NodeStatus::Running);
                    }
                }
            }
        }

        if let Some(child_id) = node.children.first() {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            
            if child_status != NodeStatus::Running {
                instance.node_states.insert(
                    node.id.clone(),
                    NodeRuntimeState {
                        status: NodeStatus::Success,
                        context: serde_json::json!({ "last_execution": Utc::now().to_rfc3339() }),
                    },
                );
            }
            
            Ok(child_status)
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_inverter(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        if let Some(child_id) = node.children.first() {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            match child_status {
                NodeStatus::Success => Ok(NodeStatus::Failure),
                NodeStatus::Failure => Ok(NodeStatus::Success),
                NodeStatus::Running => Ok(NodeStatus::Running),
                NodeStatus::Skipped => Ok(NodeStatus::Skipped),
            }
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_repeater(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let max_loops = node.config.get("max_loops").and_then(|v| v.as_i64()).unwrap_or(-1);
        
        let mut current_loop = 0;
        if let Some(state) = instance.node_states.get(&node.id) {
            current_loop = state.context.get("current_loop").and_then(|v| v.as_i64()).unwrap_or(0);
        }

        if let Some(child_id) = node.children.first() {
            if max_loops >= 0 && current_loop >= max_loops {
                return Ok(NodeStatus::Success);
            }

            let child_status = Self::execute_node(child_id, instance, definition, context).await?;

            match child_status {
                NodeStatus::Running => {
                    instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_loop": current_loop }),
                        },
                    );
                    Ok(NodeStatus::Running)
                }
                NodeStatus::Success | NodeStatus::Failure => {
                    current_loop += 1;
                    
                    if max_loops >= 0 && current_loop >= max_loops {
                        Ok(NodeStatus::Success)
                    } else {
                         instance.node_states.insert(
                            node.id.clone(),
                            NodeRuntimeState {
                                status: NodeStatus::Running,
                                context: serde_json::json!({ "current_loop": current_loop }),
                            },
                        );
                        Ok(NodeStatus::Running)
                    }
                }
                NodeStatus::Skipped => Ok(NodeStatus::Skipped),
            }
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_retry(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let max_retries = node.config.get("max_retries").and_then(|v| v.as_i64()).unwrap_or(3);
        
        let mut current_retry = 0;
        if let Some(state) = instance.node_states.get(&node.id) {
            current_retry = state.context.get("current_retry").and_then(|v| v.as_i64()).unwrap_or(0);
        }

        if let Some(child_id) = node.children.first() {
             let child_status = Self::execute_node(child_id, instance, definition, context).await?;

             match child_status {
                 NodeStatus::Success => Ok(NodeStatus::Success),
                 NodeStatus::Running => {
                     instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_retry": current_retry }),
                        },
                    );
                    Ok(NodeStatus::Running)
                 }
                 NodeStatus::Failure => {
                     current_retry += 1;
                     if current_retry > max_retries {
                         Ok(NodeStatus::Failure)
                     } else {
                         instance.node_states.insert(
                            node.id.clone(),
                            NodeRuntimeState {
                                status: NodeStatus::Running,
                                context: serde_json::json!({ "current_retry": current_retry }),
                            },
                        );
                        Ok(NodeStatus::Running)
                     }
                 }
                 NodeStatus::Skipped => Ok(NodeStatus::Skipped),
             }
        } else {
            Ok(NodeStatus::Failure)
        }
    }

    async fn execute_force_failure(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        if let Some(child_id) = node.children.first() {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            match child_status {
                NodeStatus::Running => Ok(NodeStatus::Running),
                _ => Ok(NodeStatus::Failure),
            }
        } else {
            Ok(NodeStatus::Failure)
        }
    }

    async fn execute_until_success(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let max_attempts = node.config.get("max_attempts").and_then(|v| v.as_i64()).unwrap_or(-1);
        
        let mut current_attempt = 0;
        if let Some(state) = instance.node_states.get(&node.id) {
            current_attempt = state.context.get("current_attempt").and_then(|v| v.as_i64()).unwrap_or(0);
        }

        if let Some(child_id) = node.children.first() {
            if max_attempts >= 0 && current_attempt >= max_attempts {
                return Ok(NodeStatus::Failure);
            }

            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            current_attempt += 1;

            match child_status {
                NodeStatus::Success => Ok(NodeStatus::Success),
                NodeStatus::Running => {
                    instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_attempt": current_attempt }),
                        },
                    );
                    Ok(NodeStatus::Running)
                }
                NodeStatus::Failure | NodeStatus::Skipped => {
                    instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_attempt": current_attempt }),
                        },
                    );
                    Ok(NodeStatus::Running)
                }
            }
        } else {
            Ok(NodeStatus::Failure)
        }
    }

    async fn execute_until_failure(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let max_attempts = node.config.get("max_attempts").and_then(|v| v.as_i64()).unwrap_or(-1);
        
        let mut current_attempt = 0;
        if let Some(state) = instance.node_states.get(&node.id) {
            current_attempt = state.context.get("current_attempt").and_then(|v| v.as_i64()).unwrap_or(0);
        }

        if let Some(child_id) = node.children.first() {
            if max_attempts >= 0 && current_attempt >= max_attempts {
                return Ok(NodeStatus::Success);
            }

            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            current_attempt += 1;

            match child_status {
                NodeStatus::Failure => Ok(NodeStatus::Success),
                NodeStatus::Running => {
                    instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_attempt": current_attempt }),
                        },
                    );
                    Ok(NodeStatus::Running)
                }
                NodeStatus::Success | NodeStatus::Skipped => {
                    instance.node_states.insert(
                        node.id.clone(),
                        NodeRuntimeState {
                            status: NodeStatus::Running,
                            context: serde_json::json!({ "current_attempt": current_attempt }),
                        },
                    );
                    Ok(NodeStatus::Running)
                }
            }
        } else {
            Ok(NodeStatus::Success)
        }
    }

    async fn execute_random_selector(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        if node.children.is_empty() {
            return Ok(NodeStatus::Failure);
        }

        let selected_index = if let Some(state) = instance.node_states.get(&node.id) {
            state.context.get("selected_index").and_then(|v| v.as_u64()).unwrap_or(0) as usize
        } else {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let index = rng.gen_range(0..node.children.len());
            
            instance.node_states.insert(
                node.id.clone(),
                NodeRuntimeState {
                    status: NodeStatus::Running,
                    context: serde_json::json!({ "selected_index": index }),
                },
            );
            index
        };

        if let Some(child_id) = node.children.get(selected_index) {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            
            if child_status != NodeStatus::Running {
                instance.node_states.remove(&node.id);
            }
            
            Ok(child_status)
        } else {
            Ok(NodeStatus::Failure)
        }
    }

    async fn execute_parallel(
        node: &BtNode,
        instance: &mut BehaviorTreeInstance,
        definition: &BehaviorTreeDefinition,
        context: &impl ActionContext,
    ) -> Result<NodeStatus> {
        let mut success_count = 0;
        let mut failure_count = 0;
        let mut running_count = 0;

        for child_id in &node.children {
            let child_status = Self::execute_node(child_id, instance, definition, context).await?;
            match child_status {
                NodeStatus::Success => success_count += 1,
                NodeStatus::Failure => failure_count += 1,
                NodeStatus::Running => running_count += 1,
                NodeStatus::Skipped => {},
            }
        }

        if failure_count > 0 {
            Ok(NodeStatus::Failure)
        } else if running_count > 0 {
            Ok(NodeStatus::Running)
        } else {
            Ok(NodeStatus::Success)
        }
    }
}
