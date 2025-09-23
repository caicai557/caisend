quickreply-min
==============

Minimal quick reply assistant for Windows.

Run:

- python quickreply.py
- python -m quickreply

Hotkeys (defaults):
- Alt+` show suggestions
- Ctrl+Alt+R reload phrases.json
- Ctrl+Alt+Enter toggle auto send

# QuickReply - 最小化快速回复工具

一个轻量级的快速回复工具，仅使用 Python 标准库 + keyboard + pyperclip，避免复杂的 UIA/WinAPI 依赖。

## 特性

- **轻量级**: 仅依赖 keyboard + pyperclip + tkinter
- **全局热键**: 支持全局热键操作
- **搜索过滤**: 实时搜索话术内容
- **剪贴板集成**: 通过剪贴板插入文本
- **无权限要求**: 不需要管理员权限（除非目标应用需要）

## 安装

1. 创建虚拟环境：
```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows
# 或 source .venv/bin/activate  # Linux/Mac
```

2. 安装依赖：
```bash
## QuickReply（quickreply-min）

一个面向 Windows 的“快捷话术助手”，提供常驻侧边 Dock 与就近弹出的候选建议窗口，支持全局热键、剪贴板注入、安全恢复与可配置的相似度推荐算法。

### 特性
- **分层解耦架构**：核心算法、数据访问、输入注入、平台适配、UI、热键、应用编排各自独立，易于维护与测试。
- **全局热键**：默认 Alt+` 弹出建议，Ctrl+Alt+R 重载短语，Ctrl+Alt+Enter 切换“自动回车”。
- **剪贴板注入策略**：以复制-粘贴为核心策略，粘贴后异步恢复原剪贴板内容，兼顾安全与兼容性。
- **相似度推荐**：基于中文双字分词与 Jaccard 相似度的轻量推荐，可按需替换为其他算法。
- **平台适配（Win32）**：使用 ctypes 轻量封装前台窗口、标题、矩形与“置顶不抢焦点”。
- **Tk UI**：提供就近弹出的 Suggest 窗口与常驻 Dock 面板，仅依赖服务接口，不直接触达系统 API。

### 目录结构
```text
quickreply/
  app.py                 # 应用编排入口（装配依赖、生命周期管理）
  config.py              # 配置加载/默认值/（后续可加）校验与热更新
  phrases.py             # 短语仓库（id/tags/tpl 结构）与转换工具
  recommend.py           # 纯算法：bigrams + jaccard + recommend()
  input_injector.py      # 剪贴板注入策略（复制/粘贴/恢复）
  hotkeys.py             # 热键注册与清理，失败时静默降级
  platform/
    win32.py             # 前台窗口/标题/Rect/置顶不激活
  ui/
    suggest.py           # 就近弹出建议列表
    dock.py              # 常驻 Dock，跟随/贴边与展示
  __main__.py            # 单一入口：python -m quickreply

根目录：
  phrases.json           # 话术库（示例见下）
  settings.json          # 配置（热键、top_k、目标窗口关键词等）
  README.md, LICENSE, CHANGELOG.md
```

### 快速开始
```powershell
# 1) 建议 Python 3.10/3.11+，创建虚拟环境
python -m venv .venv
. .venv\Scripts\Activate.ps1

# 2) 安装依赖（最低依赖）
pip install keyboard pyperclip

# 3) 运行（推荐使用模块入口）
python -m quickreply
# 或
python quickreply.py
```

提示：如果目标应用以管理员权限运行，请以管理员身份运行本程序，否则全局热键/粘贴可能被拦截。

### 配置（settings.json）
```json
{
  "top_k": 5,
  "hotkey_show": "alt+`",
  "hotkey_reload": "ctrl+alt+r",
  "hotkey_toggle_send": "ctrl+alt+enter",
  "target_keywords": ["易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram"]
}
```
- **top_k**: 建议条数上限。
- **hotkey_show**: 弹出建议。
- **hotkey_reload**: 重载 `phrases.json`（当前实现为占位，后续接热更新）。
- **hotkey_toggle_send**: 切换注入后是否自动回车。
- **target_keywords**: Dock 判断“需要展示”的前台窗口标题关键词（任一命中即显示）。

### 话术库（phrases.json）
```json
[
  {"id":"greet","tags":["通用","开场"],"tpl":"您好，我是客服{agent}，请问需要了解哪部分？"},
  {"id":"price","tags":["报价"],"tpl":"这边给到您当前价：{price}。含{items}，支持{support}。是否为您锁定？"},
  {"id":"delay","tags":["进度","致歉"],"tpl":"抱歉让您久等了，我已催促处理，预计{eta}前给您结果。"},
  {"id":"refund","tags":["售后","退款"],"tpl":"已为您登记退款申请，预计{days}个工作日原路退回，请留意账单通知。"}
]
```

### 使用说明
- 启动后：
  - **Alt+`**：在鼠标附近弹出建议列表（当前为演示：展示已加载的前若干项）。
  - **Dock**：当前台窗口标题包含 `settings.json` 的 `target_keywords` 任一关键词时，Dock 出现在其附近。
  - **Ctrl+Alt+R**：预留为“热重载话术库”。
  - **Ctrl+Alt+Enter**：预留为“切换粘贴后自动回车”。

### 模块与接口（开发者）
- `recommend.py`
  - `recommend(context: str, candidates: Iterable[str], top_k: int) -> list[str]`
  - `to_bigrams(text: str) -> set[str]`, `jaccard_similarity(a, b) -> float`
- `phrases.py`
  - `@dataclass Phrase(id: str, tpl: str, tags: tuple[str, ...])`
  - `load_phrases(path: Path | None) -> list[Phrase]`
  - `to_strings(items: list[Phrase]) -> list[str]`
- `input_injector.py`
  - `paste_via_clipboard(text: str, auto_send: bool = False)`
- `platform/win32.py`
  - `Rect(left, top, right, bottom)`
  - `get_foreground_hwnd() -> int`, `get_window_title(hwnd) -> str`, `get_window_rect(hwnd) -> Rect | None`
  - `set_noactivate(hwnd: int) -> None`
- `hotkeys.py`
  - `HotkeyManager.register(combo: str, callback)`，`HotkeyManager.clear()`
- `ui/suggest.py`
  - `SuggestUI.show(recs: list[str], on_pick: Callable[[str], None] | None)`
  - `SuggestUI.hide()`, `SuggestUI.loop()`，属性：`root`
- `ui/dock.py`
  - `DockUI(root: tk.Tk, on_pick: Callable[[str], None] | None, phrases: list[str], target_keywords: list[str])`

### 设计原则与扩展点
- **可替换算法**：`recommend.py` 为纯函数式，实现/替换成本低。
- **平台可扩展**：未来可在 `platform/` 下新增 `darwin.py` 等；UI 层不依赖具体平台 API。
- **策略注入**：输入注入策略可扩展（IME 输入、粘贴前探测等），当前默认剪贴板法。

### 已知限制
- Windows 专用；`keyboard` 需要足够权限拦截全局热键。
- 目标应用若以管理员启动，需要本程序同样以管理员运行。
- 粘贴法在个别应用中可能被拦截（如高安全输入框）。

### 故障排查
- 热键无效：以管理员身份运行；确保未与其他工具冲突；调整 `settings.json` 中的组合键。
- 粘贴失败：确认目标应用允许剪贴板粘贴；关闭输入法候选干扰；必要时手动粘贴验证。
- Dock 不出现：检查前台窗口标题是否包含 `target_keywords` 任一关键词。

### 许可证
本项目使用 MIT License（见 `LICENSE`）。

```

## 使用方法

1. 运行程序：
```bash
python quickreply.py
```

2. 使用热键：
   - `Ctrl+Alt+Q`: 显示/隐藏面板
   - `Ctrl+Alt+1`: 快速插入第一条话术

3. 在面板中：
   - 搜索话术内容
   - 双击或回车键插入选中的话术
   - 点击"插入选中"按钮插入

## 配置

编辑 `phrases.json` 文件来管理话术库：

```json
[
  {"id":"greet","tags":["通用","开场"],"tpl":"您好，我是客服{agent}，请问需要了解哪部分？"},
  {"id":"price","tags":["报价"],"tpl":"这边给到您当前价：{price}，包含{items}，支持{support}。需要我为您锁定吗？"}
]
```

## 注意事项

- 需要在 Windows 桌面环境运行
- 如果目标应用以管理员权限运行，请用管理员权限打开 Cursor 终端
- 程序通过剪贴板插入文本，请确保目标应用支持 Ctrl+V 粘贴
- 按 Ctrl+C 退出程序

## 技术说明

- 使用 `keyboard` 库处理全局热键
- 使用 `pyperclip` 库操作剪贴板
- 使用 `tkinter` 创建 GUI 界面
- 避免使用 UIA/WinAPI，减少 DPI 和权限问题
