use serde::{Deserialize, Serialize};

/// 账户生命周期状态
/// 
/// 用于控制 PBT 行为树的执行权限：
/// - Login: 登录中，PBT 不执行
/// - Active: 活跃状态，允许 PBT 执行
/// - Restricted: 受限状态，暂停 PBT 执行
/// - Banned: 封禁状态，停止所有执行
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStatus {
    /// 登录中 - PBT 不执行
    Login,
    /// 活跃 - 允许 PBT 执行
    Active,
    /// 受限 - 暂停 PBT 执行
    Restricted,
    /// 封禁 - 停止一切
    Banned,
}

impl LifecycleStatus {
    /// 检查当前状态是否允许 PBT 执行
    pub fn can_execute_pbt(&self) -> bool {
        matches!(self, LifecycleStatus::Active)
    }

    /// 检查是否可以接收消息
    pub fn can_receive_messages(&self) -> bool {
        matches!(self, LifecycleStatus::Active | LifecycleStatus::Restricted)
    }

    /// 状态名称（用于日志）
    pub fn as_str(&self) -> &'static str {
        match self {
            LifecycleStatus::Login => "login",
            LifecycleStatus::Active => "active",
            LifecycleStatus::Restricted => "restricted",
            LifecycleStatus::Banned => "banned",
        }
    }
}

impl Default for LifecycleStatus {
    fn default() -> Self {
        LifecycleStatus::Login
    }
}

impl ToString for LifecycleStatus {
    fn to_string(&self) -> String {
        self.as_str().to_string()
    }
}

/// 生命周期转换事件
/// 
/// 用于追踪状态变化并触发相应的副作用
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LifecycleTransition {
    pub from: LifecycleStatus,
    pub to: LifecycleStatus,
}

impl LifecycleTransition {
    pub fn new(from: LifecycleStatus, to: LifecycleStatus) -> Self {
        Self { from, to }
    }

    /// 检查是否需要暂停 PBT
    pub fn should_pause_pbt(&self) -> bool {
        self.from.can_execute_pbt() && !self.to.can_execute_pbt()
    }

    /// 检查是否需要恢复 PBT
    pub fn should_resume_pbt(&self) -> bool {
        !self.from.can_execute_pbt() && self.to.can_execute_pbt()
    }

    /// 检查是否是允许的转换
    pub fn is_valid(&self) -> bool {
        // 所有转换都允许，由业务逻辑决定
        // 未来可以添加转换规则验证
        true
    }
}

/// 生命周期管理器
/// 
/// 负责协调 PFSM 和 PBT 的状态
pub struct LifecycleManager {
    current_status: LifecycleStatus,
}

impl LifecycleManager {
    pub fn new(initial_status: LifecycleStatus) -> Self {
        Self {
            current_status: initial_status,
        }
    }

    /// 获取当前状态
    pub fn current_status(&self) -> LifecycleStatus {
        self.current_status
    }

    /// 转换到新状态
    /// 
    /// 返回转换事件，用于触发副作用
    pub fn transition_to(&mut self, new_status: LifecycleStatus) -> Option<LifecycleTransition> {
        if self.current_status == new_status {
            return None; // 状态未变化
        }

        let transition = LifecycleTransition::new(self.current_status, new_status);
        
        if !transition.is_valid() {
            tracing::warn!(
                "Invalid lifecycle transition: {} -> {}",
                transition.from.as_str(),
                transition.to.as_str()
            );
            return None;
        }

        tracing::info!(
            "Lifecycle transition: {} -> {}",
            transition.from.as_str(),
            transition.to.as_str()
        );

        self.current_status = new_status;
        Some(transition)
    }

    /// 检查是否可以执行 PBT
    pub fn can_execute_pbt(&self) -> bool {
        self.current_status.can_execute_pbt()
    }
}

impl Default for LifecycleManager {
    fn default() -> Self {
        Self::new(LifecycleStatus::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lifecycle_status_can_execute_pbt() {
        assert_eq!(LifecycleStatus::Login.can_execute_pbt(), false);
        assert_eq!(LifecycleStatus::Active.can_execute_pbt(), true);
        assert_eq!(LifecycleStatus::Restricted.can_execute_pbt(), false);
        assert_eq!(LifecycleStatus::Banned.can_execute_pbt(), false);
    }

    #[test]
    fn test_lifecycle_status_can_receive_messages() {
        assert_eq!(LifecycleStatus::Login.can_receive_messages(), false);
        assert_eq!(LifecycleStatus::Active.can_receive_messages(), true);
        assert_eq!(LifecycleStatus::Restricted.can_receive_messages(), true);
        assert_eq!(LifecycleStatus::Banned.can_receive_messages(), false);
    }

    #[test]
    fn test_lifecycle_transition() {
        let transition = LifecycleTransition::new(LifecycleStatus::Active, LifecycleStatus::Restricted);
        
        assert_eq!(transition.should_pause_pbt(), true);
        assert_eq!(transition.should_resume_pbt(), false);
    }

    #[test]
    fn test_lifecycle_manager_transition() {
        let mut manager = LifecycleManager::new(LifecycleStatus::Login);
        
        // 初始状态
        assert_eq!(manager.can_execute_pbt(), false);
        
        // 转换到 Active
        let transition = manager.transition_to(LifecycleStatus::Active);
        assert!(transition.is_some());
        assert_eq!(manager.current_status(), LifecycleStatus::Active);
        assert_eq!(manager.can_execute_pbt(), true);
        
        // 转换到 Restricted
        let transition = manager.transition_to(LifecycleStatus::Restricted);
        assert!(transition.is_some());
        assert_eq!(transition.unwrap().should_pause_pbt(), true);
        assert_eq!(manager.can_execute_pbt(), false);
        
        // 尝试相同状态转换
        let transition = manager.transition_to(LifecycleStatus::Restricted);
        assert!(transition.is_none());
    }

    #[test]
    fn test_lifecycle_status_serialization() {
        let status = LifecycleStatus::Active;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"active\"");
        
        let deserialized: LifecycleStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, status);
    }
}
