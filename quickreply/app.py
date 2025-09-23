from __future__ import annotations

from pathlib import Path
from typing import List

from .config import Settings
from .config_manager import ConfigManager
from .phrases import load_phrases, to_strings
from .recommend import recommend
from .ui.suggest import SuggestUI
from .ui.dock import DockUI
from .hotkeys import HotkeyManager
from .input_injector import paste_via_clipboard

try:
    from .ws_client import WsClient
except ImportError:
    WsClient = None  # 可选依赖


def run() -> None:
    # 使用统一配置管理器
    print("[应用] 初始化配置管理器...")
    config_manager = ConfigManager(Path("."))
    
    try:
        config = config_manager.load()
        config_manager.validate(config)
        print("[应用] ✅ 配置加载和校验成功")
    except Exception as e:
        print(f"[应用] ❌ 配置错误: {e}")
        print("[应用] 请检查 config.json 或使用 QR_* 环境变量覆盖")
        return

    # 获取配置对象
    user_config = config_manager.get_user_config()
    app_config = config_manager.get_app_config()
    
    print(f"[应用] 用户配置: theme={user_config.theme}, top_k={user_config.top_k}")
    print(f"[应用] API端点: {list(app_config.api_endpoints.keys())}")
    
    # 兼容现有Settings格式（过渡期）
    settings = Settings(
        top_k=user_config.top_k,
        hotkey_show=user_config.hotkeys.get("show", "alt+`"),
        hotkey_reload=user_config.hotkeys.get("reload", "ctrl+alt+r"),
        hotkey_toggle_send=user_config.hotkeys.get("toggle_send", "ctrl+alt+enter"),
        target_keywords=user_config.target_keywords
    )
    
    phrases = load_phrases(Path("phrases.json"))
    base_phrase_texts: List[str] = to_strings(phrases)

    ui = SuggestUI()

    # on_pick: 一键粘贴功能
    def on_pick(text: str) -> None:
        """点击推荐项时的回调，执行一键粘贴"""
        print(f"[一键粘贴] {text[:50]}...")
        paste_via_clipboard(text, auto_send=False)

    # 初始化常驻面板
    dock = DockUI(
        ui.root, 
        on_pick=on_pick, 
        phrases=base_phrase_texts[: settings.top_k], 
        target_keywords=settings.target_keywords
    )

    # WebSocket推荐订阅
    def on_recos(items: List[dict]) -> None:
        """收到WebSocket推荐时的回调"""
        texts = []
        for item in items:
            # 支持多种推荐格式
            text = item.get("text") or item.get("tpl") or str(item)
            if text and isinstance(text, str):
                texts.append(text)
        
        if texts:
            print(f"[实时推荐] 收到 {len(texts)} 条推荐，更新面板")
            # 在主线程中更新UI
            ui.root.after(0, lambda: dock.refresh(texts[: settings.top_k]))

    # 启动WebSocket客户端（使用配置中的端点）
    ws_client = None
    if WsClient is not None:
        try:
            ws_url = app_config.api_endpoints["ws"]
            ws_client = WsClient(ws_url, on_recos)
            print(f"[应用] WebSocket客户端已启动: {ws_url}")
        except Exception as e:
            print(f"[应用] WebSocket客户端启动失败: {e}")
            ws_client = None
    else:
        print("[应用] WebSocket客户端不可用，请安装 websocket-client")

    # 热键管理
    hk = HotkeyManager()
    hk.register(settings.hotkey_show, lambda: ui.show(base_phrase_texts[: settings.top_k]))
    hk.register(settings.hotkey_reload, lambda: None)
    hk.register(settings.hotkey_toggle_send, lambda: None)

    print("[应用] 界面已启动，常驻面板已激活")
    print(f"[应用] 目标关键词: {settings.target_keywords}")
    print(f"[应用] 热键 - 显示: {settings.hotkey_show}")
    
    try:
        ui.loop()
    finally:
        # 清理资源
        if ws_client:
            ws_client.stop()
        print("[应用] 已退出")



