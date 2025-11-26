use anyhow::{Result, bail};
use petgraph::graph::DiGraph;
use petgraph::algo::is_cyclic_directed;
use petgraph::visit::Dfs;
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

use crate::domain::workflow::schema::WorkflowDefinition;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

pub struct WorkflowValidator;

impl WorkflowValidator {
    /// 验证工作流定义
    pub fn validate(definition: &WorkflowDefinition) -> Result<ValidationReport> {
        let mut report = ValidationReport {
            errors: vec![],
            warnings: vec![],
        };

        // 1. 基础检查
        if definition.nodes.is_empty() {
            report.errors.push("工作流至少需要一个节点".to_string());
            return Ok(report);
        }

        // 2. 检测死循环
        if let Err(e) = Self::check_cycles(definition) {
            report.errors.push(format!("检测到死循环: {}", e));
        }

        // 3. 验证连接性
        if let Err(e) = Self::check_connectivity(definition) {
            report.warnings.push(format!("连接性警告: {}", e));
        }

        // 4. 检查条件分支完整性
        if let Err(e) = Self::check_branches(definition) {
            report.warnings.push(format!("分支完整性警告: {}", e));
        }

        // 5. 检查触发器
        if let Err(e) = Self::check_triggers(definition) {
            report.errors.push(format!("触发器错误: {}", e));
        }

        Ok(report)
    }

    /// 检测死循环
    fn check_cycles(definition: &WorkflowDefinition) -> Result<()> {
        let mut graph = DiGraph::<String, ()>::new();
        let mut node_indices = HashMap::new();

        // 构建图
        for (node_id, _) in &definition.nodes {
            let idx = graph.add_node(node_id.clone());
            node_indices.insert(node_id.clone(), idx);
        }

        for edge in &definition.edges {
            if let (Some(&source_idx), Some(&target_idx)) = (
                node_indices.get(&edge.source_node_id),
                node_indices.get(&edge.target_node_id),
            ) {
                graph.add_edge(source_idx, target_idx, ());
            }
        }

        // 检测环
        if is_cyclic_directed(&graph) {
            bail!("工作流包含环，这将导致无限循环");
        }

        Ok(())
    }

    /// 验证连接性（所有节点是否可达）
    fn check_connectivity(definition: &WorkflowDefinition) -> Result<()> {
        if definition.nodes.is_empty() {
            return Ok(());
        }

        let mut graph = DiGraph::<String, ()>::new();
        let mut node_indices = HashMap::new();

        // 构建图
        for (node_id, _) in &definition.nodes {
            let idx = graph.add_node(node_id.clone());
            node_indices.insert(node_id.clone(), idx);
        }

        for edge in &definition.edges {
            if let (Some(&source_idx), Some(&target_idx)) = (
                node_indices.get(&edge.source_node_id),
                node_indices.get(&edge.target_node_id),
            ) {
                graph.add_edge(source_idx, target_idx, ());
            }
        }

        // 找到所有触发器节点
        let trigger_nodes: Vec<_> = definition.nodes.iter()
            .filter(|(_, node)| node.node_type.to_lowercase() == "trigger")
            .collect();

        if trigger_nodes.is_empty() {
            bail!("未找到触发器节点");
        }

        // 检查从触发器到所有节点的可达性
        let mut reachable = HashSet::new();
        for (trigger_id, _) in trigger_nodes {
            if let Some(&trigger_idx) = node_indices.get(trigger_id) {
                let mut dfs = Dfs::new(&graph, trigger_idx);
                while let Some(node_idx) = dfs.next(&graph) {
                    reachable.insert(node_idx);
                }
            }
        }

        // 检查孤立节点
        let all_nodes: HashSet<_> = node_indices.values().cloned().collect();
        let unreachable: Vec<_> = all_nodes.difference(&reachable).collect();
        
        if !unreachable.is_empty() {
            bail!("存在 {} 个孤立节点，无法从触发器到达", unreachable.len());
        }

        Ok(())
    }

    /// 检查条件分支完整性
    fn check_branches(definition: &WorkflowDefinition) -> Result<()> {
        // 检查所有条件节点是否有至少一个输出边
        for (node_id, node) in &definition.nodes {
            if node.node_type.to_lowercase() == "condition" {
                let outgoing_count = definition.edges.iter()
                    .filter(|e| e.source_node_id == *node_id)
                    .count();
                
                if outgoing_count == 0 {
                    bail!("条件节点 '{}' 没有输出边", node_id);
                }
            }
        }

        Ok(())
    }

    /// 检查触发器
    fn check_triggers(definition: &WorkflowDefinition) -> Result<()> {
        let trigger_count = definition.nodes.iter()
            .filter(|(_, node)| node.node_type.to_lowercase() == "trigger")
            .count();

        if trigger_count == 0 {
            bail!("工作流必须包含至少一个触发器节点");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workflow::schema::{WorkflowNode, WorkflowEdge};
    use std::collections::HashMap;

    #[test]
    fn test_simple_workflow() {
        let mut nodes = HashMap::new();
        nodes.insert("trigger1".to_string(), WorkflowNode {
            id: "trigger1".to_string(),
            node_type: "trigger".to_string(),
            config: serde_json::json!({}),
        });
        nodes.insert("action1".to_string(), WorkflowNode {
            id: "action1".to_string(),
            node_type: "action".to_string(),
            config: serde_json::json!({}),
        });

        let edges = vec![
            WorkflowEdge {
                source_node_id: "trigger1".to_string(),
                target_node_id: "action1".to_string(),
                condition: None,
            },
        ];

        let definition = WorkflowDefinition {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test workflow".to_string(),
            nodes,
            edges,
        };

        let report = WorkflowValidator::validate(&definition).unwrap();
        assert_eq!(report.errors.len(), 0);
    }

    #[test]
    fn test_cycle_detection() {
        let mut nodes = HashMap::new();
        nodes.insert("trigger1".to_string(), WorkflowNode {
            id: "trigger1".to_string(),
            node_type: "trigger".to_string(),
            config: serde_json::json!({}),
        });
        nodes.insert("action1".to_string(), WorkflowNode {
            id: "action1".to_string(),
            node_type: "action".to_string(),
            config: serde_json::json!({}),
        });

        let edges = vec![
            WorkflowEdge {
                source_node_id: "trigger1".to_string(),
                target_node_id: "action1".to_string(),
                condition: None,
            },
            WorkflowEdge {
                source_node_id: "action1".to_string(),
                target_node_id: "trigger1".to_string(),
                condition: None,
            },
        ];

        let definition = WorkflowDefinition {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test workflow".to_string(),
            nodes,
            edges,
        };

        let report = WorkflowValidator::validate(&definition).unwrap();
        assert!(report.errors.iter().any(|e| e.contains("环")));
    }
}
