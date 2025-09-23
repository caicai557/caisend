"""统一配置管理器 - 解决配置分散和冲突问题"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# 配置模式校验
SCHEMA_VALIDATION = {
    "user": {
        "theme": str,
        "hotkeys": dict,
        "top_k": int,
        "target_keywords": (list, tuple)
    },
    "app": {
        "api_endpoints": dict,
        "security": dict
    },
    "cdp": {
        "host": str,
        "port": int,
        "range": str
    }
}


@dataclass
class UserConfig:
    """用户级配置 - UI偏好、热键、展示设置"""
    theme: str = "dark"
    hotkeys: Dict[str, str] = field(default_factory=lambda: {
        "show": "alt+`",
        "reload": "ctrl+alt+r",
        "toggle_send": "ctrl+alt+enter"
    })
    top_k: int = 5
    target_keywords: Tuple[str, ...] = ("易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram")


@dataclass
class AppConfig:
    """应用级配置 - API端点、安全策略"""
    api_endpoints: Dict[str, str] = field(default_factory=lambda: {
        "ws": "ws://127.0.0.1:7799",
        "recommend": "http://127.0.0.1:7788/recommend",
        "ingest": "http://127.0.0.1:7788/ingest",
        "phrases": "http://127.0.0.1:7788/phrases",
        "health": "http://127.0.0.1:7788/health",
        "metrics": "http://127.0.0.1:7788/metrics"
    })
    security: Dict[str, Any] = field(default_factory=lambda: {
        "token": "",
        "allow_origins": ["*"],
        "timeout": 10
    })


@dataclass
class CDPConfig:
    """CDP调试配置 - 端口探测、连接参数"""
    host: str = "127.0.0.1"
    port: Optional[int] = None  # 优先端口，None表示自动探测
    range: str = "9222-9333"
    timeout: float = 0.5
    max_workers: int = 24


class ConfigManager:
    """统一配置管理器
    
    功能:
    - 集中化配置加载和保存
    - 环境变量覆盖 (QR_* 前缀)
    - 兼容旧配置文件格式
    - 配置校验和错误提示
    """
    
    def __init__(
        self,
        root: Optional[Path] = None,
        main_name: str = "config.json",
        user_name: str = "settings.json",
        app_name: str = "quickreply.config.json",
        env_prefix: str = "QR_"
    ) -> None:
        self.root = Path(root or ".").resolve()
        self.main_path = self.root / main_name
        self.user_path = self.root / user_name
        self.app_path = self.root / app_name
        self.env_prefix = env_prefix
        
        # 配置缓存
        self._cache: Optional[Dict[str, Any]] = None

    def load(self, use_cache: bool = True) -> Dict[str, Any]:
        """加载统一配置
        
        优先级: 默认值 → config.json → 旧配置迁移 → 环境变量
        """
        if use_cache and self._cache is not None:
            return self._cache

        # 1. 基础默认配置
        config = {
            "user": asdict(UserConfig()),
            "app": asdict(AppConfig()),
            "cdp": asdict(CDPConfig())
        }

        # 2. 主配置文件覆盖
        main_config = self._load_file(self.main_path)
        if main_config:
            config = self._deep_merge(config, main_config)

        # 3. 兼容旧配置文件
        config = self._migrate_legacy_configs(config)

        # 4. 环境变量覆盖
        env_overrides = self._load_env_overrides()
        if env_overrides:
            config = self._deep_merge(config, env_overrides)

        self._cache = config
        return config

    def save(self, config: Dict[str, Any]) -> None:
        """保存配置到主配置文件"""
        self.main_path.parent.mkdir(parents=True, exist_ok=True)
        self.main_path.write_text(
            json.dumps(config, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        self._cache = None  # 清除缓存

    def validate(self, config: Optional[Dict[str, Any]] = None) -> None:
        """配置校验 - 检查必需字段和类型"""
        cfg = config or self.load()
        
        def check_path(path: str, expected_type, value):
            if not isinstance(value, expected_type):
                raise TypeError(f"配置类型错误: {path} 期望 {expected_type.__name__}, 实际 {type(value).__name__}")

        def require(path: str, expected_type):
            parts = path.split(".")
            current = cfg
            for part in parts:
                if part not in current:
                    raise ValueError(f"配置缺失: {path}")
                current = current[part]
            check_path(path, expected_type, current)

        # 必需配置检查
        require("user", dict)
        require("user.theme", str)
        require("user.hotkeys", dict)
        require("user.top_k", int)
        require("user.target_keywords", (list, tuple))
        
        require("app", dict)
        require("app.api_endpoints", dict)
        require("app.security", dict)
        
        require("cdp", dict)
        require("cdp.host", str)
        require("cdp.range", str)

        # API端点检查
        api_endpoints = cfg["app"]["api_endpoints"]
        for key in ("ws", "recommend", "ingest"):
            if key not in api_endpoints:
                raise ValueError(f"缺失API端点: app.api_endpoints.{key}")
            if not isinstance(api_endpoints[key], str) or not api_endpoints[key].strip():
                raise ValueError(f"API端点无效: app.api_endpoints.{key}")

        # CDP范围格式检查
        cdp_range = cfg["cdp"]["range"]
        if not isinstance(cdp_range, str) or "-" not in cdp_range:
            raise ValueError(f"CDP端口范围格式错误: {cdp_range} (期望格式: '9222-9333')")
        
        try:
            start, end = map(int, cdp_range.split("-", 1))
            if start >= end or start < 1024 or end > 65535:
                raise ValueError(f"CDP端口范围无效: {start}-{end}")
        except ValueError as e:
            raise ValueError(f"CDP端口范围解析失败: {cdp_range} ({e})")

    def get_user_config(self) -> UserConfig:
        """获取用户配置对象"""
        cfg = self.load()
        user_data = cfg["user"]
        return UserConfig(
            theme=user_data.get("theme", "dark"),
            hotkeys=user_data.get("hotkeys", UserConfig().hotkeys),
            top_k=int(user_data.get("top_k", 5)),
            target_keywords=tuple(user_data.get("target_keywords", UserConfig().target_keywords))
        )

    def get_app_config(self) -> AppConfig:
        """获取应用配置对象"""
        cfg = self.load()
        app_data = cfg["app"]
        return AppConfig(
            api_endpoints=app_data.get("api_endpoints", AppConfig().api_endpoints),
            security=app_data.get("security", AppConfig().security)
        )

    def get_cdp_config(self) -> CDPConfig:
        """获取CDP配置对象"""
        cfg = self.load()
        cdp_data = cfg["cdp"]
        return CDPConfig(
            host=cdp_data.get("host", "127.0.0.1"),
            port=cdp_data.get("port"),
            range=cdp_data.get("range", "9222-9333"),
            timeout=float(cdp_data.get("timeout", 0.5)),
            max_workers=int(cdp_data.get("max_workers", 24))
        )

    def reload(self) -> Dict[str, Any]:
        """重新加载配置（清除缓存）"""
        self._cache = None
        return self.load()

    # ---------- 内部方法 ----------

    def _load_file(self, path: Path) -> Dict[str, Any]:
        """安全加载JSON文件"""
        try:
            if path.exists():
                content = path.read_text(encoding="utf-8")
                return json.loads(content) or {}
        except Exception as e:
            print(f"[ConfigManager] 加载配置文件失败 {path}: {e}")
        return {}

    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """深度合并配置"""
        result = json.loads(json.dumps(base))  # 深拷贝
        
        def merge_recursive(target, source):
            for key, value in source.items():
                if isinstance(value, dict) and isinstance(target.get(key), dict):
                    merge_recursive(target[key], value)
                else:
                    target[key] = value
        
        merge_recursive(result, override)
        return result

    def _migrate_legacy_configs(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """迁移旧配置文件格式"""
        # 迁移 settings.json (用户级)
        legacy_user = self._load_file(self.user_path)
        if legacy_user:
            migrated_user = {}
            
            # 映射旧键名到新结构
            if "top_k" in legacy_user:
                migrated_user["top_k"] = int(legacy_user["top_k"])
            
            if "target_keywords" in legacy_user:
                migrated_user["target_keywords"] = list(legacy_user["target_keywords"])
            
            # 热键映射
            hotkeys = {}
            if "hotkey_show" in legacy_user:
                hotkeys["show"] = legacy_user["hotkey_show"]
            if "hotkey_reload" in legacy_user:
                hotkeys["reload"] = legacy_user["hotkey_reload"]
            if "hotkey_toggle_send" in legacy_user:
                hotkeys["toggle_send"] = legacy_user["hotkey_toggle_send"]
            
            if hotkeys:
                migrated_user["hotkeys"] = {**config["user"]["hotkeys"], **hotkeys}
            
            if migrated_user:
                config = self._deep_merge(config, {"user": migrated_user})

        # 迁移 quickreply.config.json (应用级)
        legacy_app = self._load_file(self.app_path)
        if legacy_app:
            # 这里主要是dock尺寸等UI配置，暂时保留在原位置
            pass

        return config

    def _load_env_overrides(self) -> Dict[str, Any]:
        """加载环境变量覆盖"""
        overrides = {}
        
        # 环境变量映射表
        env_mappings = {
            "QR_THEME": ("user", "theme"),
            "QR_TOP_K": ("user", "top_k"),
            "QR_HK_SHOW": ("user", "hotkeys", "show"),
            "QR_HK_RELOAD": ("user", "hotkeys", "reload"),
            "QR_HK_TOGGLE_SEND": ("user", "hotkeys", "toggle_send"),
            "QR_WS_URL": ("app", "api_endpoints", "ws"),
            "QR_RECOMMEND_URL": ("app", "api_endpoints", "recommend"),
            "QR_INGEST_URL": ("app", "api_endpoints", "ingest"),
            "QR_TOKEN": ("app", "security", "token"),
            "QR_TIMEOUT": ("app", "security", "timeout"),
            "QR_CDP_HOST": ("cdp", "host"),
            "QR_CDP_PORT": ("cdp", "port"),
            "QR_CDP_RANGE": ("cdp", "range"),
            "QR_CDP_TIMEOUT": ("cdp", "timeout"),
            "QR_CDP_MAX_WORKERS": ("cdp", "max_workers"),
        }

        for env_key, path in env_mappings.items():
            value = os.environ.get(env_key)
            if value is None:
                continue

            # 设置嵌套字典路径
            current = overrides
            for part in path[:-1]:
                current = current.setdefault(part, {})
            
            # 类型转换
            final_key = path[-1]
            try:
                if final_key in ("top_k", "port", "timeout", "max_workers"):
                    if final_key == "port" and value.lower() in ("", "none", "auto"):
                        current[final_key] = None
                    else:
                        current[final_key] = int(value) if final_key != "timeout" else float(value)
                elif final_key == "target_keywords":
                    current[final_key] = [kw.strip() for kw in value.split(",") if kw.strip()]
                else:
                    current[final_key] = value
            except ValueError:
                print(f"[ConfigManager] 环境变量类型转换失败 {env_key}={value}")

        return overrides
