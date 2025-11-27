// PBT Engine Demo - 测试行为树执行
use teleflow_desktop_lib::domain::decision::behavior_tree::{BehaviorNode, NodeStatus, TreeState};
use std::collections::HashMap;

#[tokio::main]
async fn main() {
    // 创建一个简单的测试行为树：Sequence(登录 -> 检查消息)
    let test_tree = BehaviorNode::Sequence {
        id: "login_flow".to_string(),
        children: vec![
            BehaviorNode::Action {
                id: "open_telegram".to_string(),
                action_type: "navigate".to_string(),
                params: {
                    let mut p = HashMap::new();
                    p.insert("url".to_string(), "https://web.telegram.org/k/".to_string());
                    p
                },
            },
            BehaviorNode::Condition {
                id: "check_logged_in".to_string(),
                condition_type: "element_exists".to_string(),
                params: {
                    let mut p = HashMap::new();
                    p.insert("selector".to_string(), "#column-center".to_string());
                    p
                },
            },
            BehaviorNode::Action {
                id: "check_messages".to_string(),
                action_type: "click".to_string(),
                params: {
                    let mut p = HashMap::new();
                    p.insert("selector".to_string(), ".chatlist".to_string());
                    p
                },
            },
        ],
    };

    println!("=== PBT Engine Demo ===");
    println!("测试行为树结构:");
    println!("{:#?}", test_tree);
    
    // 创建初始树状态
    let tree_state = TreeState {
        tree_id: "login_flow".to_string(),
        current_node_id: None,
        context: HashMap::new(),
        status: "running".to_string(),
    };
    
    println!("\n初始状态:");
    println!("{:#?}", tree_state);
    println!("\n✅ PBT 引擎演示完成！");
    println!("下一步: 通过 AccountActor 的 Tick 消息触发实际执行");
}
