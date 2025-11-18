"""配置验证器"""

from typing import Dict, Any, List
from pathlib import Path

from ..models.config import TeleflowConfig


class ConfigValidator:
    """配置文件验证器"""
    
    def __init__(self):
        """初始化验证器"""
        self.required_fields = {
            "version": str,
            "accounts": list,
        }
        self.optional_fields = {
            "default_account": str,
            "logging": dict,
            "browser": dict,
            "runtime": dict,
            "global_rules": list,
            "description": str,
        }
    
    def validate_raw_config(self, config: Dict[str, Any]) -> None:
        """验证原始配置字典
        
        Args:
            config: 原始配置字典
            
        Raises:
            ValueError: 验证失败
        """
        if not isinstance(config, dict):
            raise ValueError("配置必须是字典格式")
        
        # 检查必需字段
        missing_fields = []
        for field, field_type in self.required_fields.items():
            if field not in config:
                missing_fields.append(field)
            elif not isinstance(config[field], field_type):
                raise ValueError(f"字段 '{field}' 必须是 {field_type.__name__} 类型")
        
        if missing_fields:
            raise ValueError(f"缺少必需字段: {', '.join(missing_fields)}")
        
        # 验证版本
        self._validate_version(config.get("version"))
        
        # 验证账号列表
        self._validate_accounts_list(config.get("accounts", []))
        
        # 验证可选字段类型
        for field, field_type in self.optional_fields.items():
            if field in config and config[field] is not None:
                if not isinstance(config[field], field_type):
                    raise ValueError(f"可选字段 '{field}' 必须是 {field_type.__name__} 类型")
        
        # 验证日志配置
        if "logging" in config:
            self._validate_logging_config(config["logging"])
        
        # 验证浏览器配置
        if "browser" in config:
            self._validate_browser_config(config["browser"])
        
        # 验证运行时配置
        if "runtime" in config:
            self._validate_runtime_config(config["runtime"])
        
        # 验证全局规则
        if "global_rules" in config:
            self._validate_rules_list(config["global_rules"], "全局规则")
    
    def validate_config(self, config: TeleflowConfig) -> None:
        """验证配置对象
        
        Args:
            config: 配置对象
            
        Raises:
            ValueError: 验证失败
        """
        # 验证账号配置
        if not config.accounts:
            raise ValueError("至少需要配置一个账号")
        
        # 验证默认账号
        if config.default_account:
            account_names = [acc.name for acc in config.accounts]
            if config.default_account not in account_names:
                raise ValueError(f"默认账号 '{config.default_account}' 不在账号列表中")
        
        # 验证每个账号
        for account in config.accounts:
            self._validate_account_config(account)
        
        # 验证浏览器数据目录
        for account in config.accounts:
            if account.browser_data_dir:
                browser_dir = Path(account.browser_data_dir)
                if browser_dir.exists() and not browser_dir.is_dir():
                    raise ValueError(f"浏览器数据路径不是目录: {browser_dir}")
    
    def _validate_version(self, version: Any) -> None:
        """验证版本字段"""
        if not isinstance(version, str):
            raise ValueError("版本必须是字符串")
        
        if not version.strip():
            raise ValueError("版本不能为空")
        
        # 简单的版本格式验证
        version = version.strip()
        parts = version.split('.')
        if len(parts) < 2 or len(parts) > 3:
            raise ValueError("版本格式应为 x.y 或 x.y.z (如 1.0 或 1.0.0)")
        
        try:
            for part in parts:
                int(part)
        except ValueError:
            raise ValueError("版本号必须由数字组成")
    
    def _validate_accounts_list(self, accounts: List[Dict[str, Any]]) -> None:
        """验证账号列表"""
        if not isinstance(accounts, list):
            raise ValueError("账号列表必须是列表类型")
        
        if not accounts:
            raise ValueError("账号列表不能为空")
        
        # 检查账号名称唯一性
        names = []
        for account in accounts:
            if not isinstance(account, dict):
                raise ValueError("账号配置必须是字典格式")
            
            if "name" not in account:
                raise ValueError("账号配置缺少 'name' 字段")
            
            name = account["name"]
            if not isinstance(name, str) or not name.strip():
                raise ValueError("账号名称必须是非空字符串")
            
            if name in names:
                raise ValueError(f"账号名称重复: {name}")
            names.append(name)
            
            # 验证账号配置
            self._validate_account_dict(account)
    
    def _validate_account_dict(self, account: Dict[str, Any]) -> None:
        """验证单个账号字典"""
        required_account_fields = ["name"]
        
        # 检查必需字段
        for field in required_account_fields:
            if field not in account:
                raise ValueError(f"账号配置缺少必需字段: {field}")
        
        # 验证监控聊天列表
        if "monitor_chats" in account:
            monitor_chats = account["monitor_chats"]
            if not isinstance(monitor_chats, list):
                raise ValueError("monitor_chats 必须是列表类型")
            
            for chat in monitor_chats:
                if not isinstance(chat, str) or not chat.strip():
                    raise ValueError("聊天用户名必须是非空字符串")
        
        # 验证规则列表
        if "rules" in account:
            self._validate_rules_list(account["rules"], f"账号 '{account['name']}' 的规则")
        
        # 验证浏览器数据目录
        if "browser_data_dir" in account:
            browser_dir = account["browser_data_dir"]
            if browser_dir is not None:
                if not isinstance(browser_dir, (str, Path)):
                    raise ValueError("browser_data_dir 必须是字符串或路径对象")
    
    def _validate_rules_list(self, rules: List[Dict[str, Any]], context: str) -> None:
        """验证规则列表"""
        if not isinstance(rules, list):
            raise ValueError(f"{context} 必须是列表类型")
        
        for i, rule in enumerate(rules):
            if not isinstance(rule, dict):
                raise ValueError(f"{context}[{i}] 必须是字典格式")
            
            self._validate_rule_dict(rule, f"{context}[{i}]")
    
    def _validate_rule_dict(self, rule: Dict[str, Any], context: str) -> None:
        """验证单个规则字典"""
        required_rule_fields = ["keywords", "reply_text", "fixed_delay", "random_delay_max"]
        
        # 检查必需字段
        for field in required_rule_fields:
            if field not in rule:
                raise ValueError(f"{context} 缺少必需字段: {field}")
        
        # 验证关键词列表
        keywords = rule["keywords"]
        if not isinstance(keywords, list) or not keywords:
            raise ValueError(f"{context} keywords 必须是非空列表")
        
        for keyword in keywords:
            if not isinstance(keyword, str) or not keyword.strip():
                raise ValueError(f"{context} 关键词必须是非空字符串")
        
        # 验证回复内容
        reply_text = rule["reply_text"]
        if not isinstance(reply_text, str) or not reply_text.strip():
            raise ValueError(f"{context} reply_text 必须是非空字符串")
        
        # 验证延时参数
        for delay_field in ["fixed_delay", "random_delay_max"]:
            delay = rule[delay_field]
            if not isinstance(delay, (int, float)) or delay < 0:
                raise ValueError(f"{context} {delay_field} 必须是非负数")
    
    def _validate_logging_config(self, logging_config: Dict[str, Any]) -> None:
        """验证日志配置"""
        if "level" in logging_config:
            level = logging_config["level"]
            valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR"]
            if level not in valid_levels:
                raise ValueError(f"日志级别必须是以下之一: {valid_levels}")
    
    def _validate_browser_config(self, browser_config: Dict[str, Any]) -> None:
        """验证浏览器配置"""
        numeric_fields = ["viewport_width", "viewport_height", "timeout"]
        
        for field in numeric_fields:
            if field in browser_config:
                value = browser_config[field]
                if not isinstance(value, (int, float)) or value <= 0:
                    raise ValueError(f"浏览器配置 {field} 必须是正数")
    
    def _validate_runtime_config(self, runtime_config: Dict[str, Any]) -> None:
        """验证运行时配置"""
        if "check_interval" in runtime_config:
            interval = runtime_config["check_interval"]
            if not isinstance(interval, (int, float)) or interval <= 0:
                raise ValueError("check_interval 必须是正数")
        
        if "random_seed" in runtime_config:
            seed = runtime_config["random_seed"]
            if seed is not None and (not isinstance(seed, int) or seed < 0):
                raise ValueError("random_seed 必须是非负整数")
    
    def _validate_account_config(self, account) -> None:
        """验证账号配置对象"""
        if not account.name:
            raise ValueError("账号名称不能为空")
        
        # 验证监控聊天
        if not account.monitor_chats:
            raise ValueError(f"账号 '{account.name}' 必须配置至少一个监控聊天")
        
        # 验证规则
        if not account.rules and not hasattr(account, '_has_global_rules'):
            # 注意：这里可能需要根据实际需求调整
            pass  # 允许没有特定规则的账号（使用全局规则）
