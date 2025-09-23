# quickreply.py  — 最小可用：热键弹出推荐，一键填入输入框
import json, time, ctypes, threading
from pathlib import Path
import tkinter as tk
import tkinter.font as tkfont
import pyperclip
import keyboard

# ---------------- 配置（可改） ----------------
PHRASE_FILE = Path(__file__).with_name("phrases.json")
CONFIG_FILE = Path(__file__).with_name("quickreply.config.json")
TOP_K = 5
HOTKEY_SHOW = "alt+`"          # 弹出/刷新推荐
HOTKEY_RELOAD = "ctrl+alt+r"   # 重载 phrases.json
HOTKEY_TOGGLE_AUTOSEND = "ctrl+alt+enter"  # 切换插入后回车
AUTO_SEND = False              # 默认不自动回车发送
TARGET_KEYWORDS = ["易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram"]  # 目标窗口关键词（可改）

# ---------------- 工具 ----------------
def load_phrases():
    try:
        data = json.loads(PHRASE_FILE.read_text(encoding="utf-8"))
        return [it.get("tpl","") for it in data if it.get("tpl")]
    except Exception:
        return []

def bigrams(s: str):
    s = "".join(ch for ch in s if not ch.isspace())
    return {s[i:i+2] for i in range(len(s)-1)} if len(s) > 1 else set()

def jaccard(a: set, b: set) -> float:
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

def recommend(context: str, candidates: list[str], k=TOP_K):
    grams = bigrams(context)
    scored = [(jaccard(grams, bigrams(t)), t) for t in candidates]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:k]]

def set_noactivate(hwnd: int):
    # 让 Tk 浮窗不抢焦点
    GWL_EXSTYLE = -20
    WS_EX_NOACTIVATE = 0x08000000
    WS_EX_TOOLWINDOW = 0x00000080
    WS_EX_TOPMOST = 0x00000008
    user32 = ctypes.windll.user32
    ex = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
    user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST)

# ---------------- 字体调整：全局放大 N 号 ----------------
def bump_default_fonts(delta: int = 2):
    try:
        names = [
            "TkDefaultFont",
            "TkTextFont",
            "TkFixedFont",
            "TkMenuFont",
            "TkHeadingFont",
        ]
        for name in names:
            try:
                f = tkfont.nametofont(name)
                size = int(f.cget("size"))
                # Tk 负数表示像素高度；更负即更大
                new_size = size + delta if size > 0 else size - delta
                f.configure(size=new_size)
            except Exception:
                continue
    except Exception:
        pass

# ---------------- 配置读写 ----------------
def load_user_size(default_w: int, default_h: int):
    try:
        cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        w = int(cfg.get("dock_width", default_w))
        h = int(cfg.get("dock_height", default_h))
        return max(200, w), max(80, h)
    except Exception:
        return default_w, default_h

def save_user_size(w: int, h: int):
    try:
        cfg = {"dock_width": int(w), "dock_height": int(h)}
        CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

# ---------------- UI：建议浮窗 ----------------
class SuggestUI:
    def __init__(self):
        self.root = tk.Tk()
        bump_default_fonts(2)
        self.root.withdraw()  # 无主窗
        self.win = tk.Toplevel(self.root)
        self.win.overrideredirect(True)
        self.win.wm_title("quickreply_suggest")
        self.win.configure(bg="#1e1e1e")
        self.win.attributes("-topmost", True)
        self.frame = tk.Frame(self.win, bg="#1e1e1e")
        self.frame.pack(fill="both", expand=True)
        self.labels = []
        self.visible = False
        self.auto_send = AUTO_SEND
        try: set_noactivate(self.win.winfo_id())
        except: pass

        # 热键：Alt+1..5 选择；Esc 关闭
        for i in range(1, 6):
            keyboard.add_hotkey(f"alt+{i}", lambda idx=i-1: self.choose_idx(idx))
        keyboard.add_hotkey("esc", self.hide)

        # 状态
        self.candidates = []
        self.recs = []
        self.context_text = ""

    def _clear(self):
        for w in self.labels: w.destroy()
        self.labels.clear()

    def show(self, recs: list[str]):
        self.recs = recs
        self._clear()
        # 布局
        for i, s in enumerate(recs):
            row = tk.Frame(self.frame, bg="#1e1e1e")
            row.pack(fill="x", padx=8, pady=4)
            tk.Label(row, text=f"Alt+{i+1}", fg="#aaaaaa", bg="#1e1e1e", width=6, anchor="w").pack(side="left")
            lbl = tk.Label(row, text=s, fg="#ffffff", bg="#1e1e1e", wraplength=520, justify="left")
            lbl.pack(side="left", fill="x", expand=True)
            lbl.bind("<Button-1>", lambda e, t=s: self.choose_text(t))
            self.labels.append(lbl)

        # 位置：鼠标下方（用 Tk 获取指针坐标）
        try:
            mx, my = self.root.winfo_pointerx(), self.root.winfo_pointery()
        except Exception:
            mx, my = 200, 200
        self.win.geometry(f"+{mx+16}+{my+20}")
        self.win.deiconify()
        self.win.lift()
        try: set_noactivate(self.win.winfo_id())
        except: pass
        self.visible = True

    def hide(self):
        if not self.visible: return
        self.win.withdraw()
        self.visible = False

    def choose_idx(self, idx: int):
        if 0 <= idx < len(self.recs):
            self.choose_text(self.recs[idx])

    def choose_text(self, text: str):
        self.hide()
        # 以剪贴板粘贴，尽量避免焦点问题
        try:
            old = pyperclip.paste()
        except Exception:
            old = None
        try:
            pyperclip.copy(text)
            time.sleep(0.05)
            keyboard.send("ctrl+v")
            if self.auto_send:
                time.sleep(0.02)
                keyboard.send("enter")
        finally:
            if old is not None:
                # 轻延迟恢复，避免覆盖用户后续粘贴
                def restore():
                    time.sleep(0.2)
                    try: pyperclip.copy(old)
                    except: pass
                threading.Thread(target=restore, daemon=True).start()

    def loop(self):
        self.root.mainloop()

# ---------------- 常驻吸附 Dock ----------------
class DockUI:
    def __init__(self, root: tk.Tk, on_pick, phrases: list[str], target_keywords: list[str]):
        self.root = root
        self.on_pick = on_pick
        self.phrases = phrases
        self.target_keywords = target_keywords
        self.context = ""
        self.current_items: list[str] = []
        self.lock_hwnd: int = 0  # 锁定目标窗口句柄（0 表示未锁定）

        # 外观
        self.win = tk.Toplevel(self.root)
        self.win.overrideredirect(True)
        self.win.configure(bg="#1e1e1e")
        self.win.attributes("-topmost", True)
        try: set_noactivate(self.win.winfo_id())
        except: pass
        self.visible = False
        self.win.withdraw()

        self.width, self.height = load_user_size(700, 150)
        self.margin = 10

        # UI 结构
        rootf = tk.Frame(self.win, bg="#1e1e1e")
        rootf.pack(fill="both", expand=True)

        # 删除标题以节省垂直空间

        wrap = tk.Frame(rootf, bg="#1e1e1e")
        wrap.pack(fill="both", expand=True, padx=8, pady=(0,8))
        self.listbox = tk.Listbox(wrap, activestyle="dotbox")
        self.listbox.pack(side="left", fill="both", expand=True)
        sc = tk.Scrollbar(wrap, command=self.listbox.yview)
        sc.pack(side="right", fill="y")
        self.listbox.config(yscrollcommand=sc.set)
        self.listbox.bind("<Double-Button-1>", lambda e: self._insert_selected())
        self.listbox.bind("<Return>", lambda e: self._insert_selected())

        # 简易尺寸拖拽：右边缘、下边缘、右下角
        self.edge_thickness = 6
        self.win.bind("<Motion>", self._on_motion)
        self.win.bind("<Leave>", lambda e: self.win.config(cursor=""))
        self.win.bind("<ButtonPress-1>", self._on_press)
        self.win.bind("<B1-Motion>", self._on_drag)
        self.win.bind("<ButtonRelease-1>", self._on_release)

        self._resizing = False
        self._resize_mode = None  # 'right' | 'bottom' | 'corner'
        self._press_x = 0
        self._press_y = 0
        self._start_w = self.width
        self._start_h = self.height

        self.refresh_list()
        self._adsorb_tick()

    # 数据
    def set_phrases(self, phrases: list[str]):
        self.phrases = phrases
        self.refresh_list()

    def set_context(self, ctx: str):
        self.context = ctx or ""
        self.refresh_list()

    def lock_to_foreground(self):
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            self.lock_hwnd = int(hwnd)
        except Exception:
            self.lock_hwnd = 0

    def clear_lock(self):
        self.lock_hwnd = 0

    def refresh_list(self):
        base = self.phrases
        # 基于上下文排序（不截断到 5 条）
        if self.context.strip():
            base = recommend(self.context, self.phrases, k=len(self.phrases))
        self.current_items = base
        self.listbox.delete(0, tk.END)
        for s in base:
            self.listbox.insert(tk.END, s)

    # 交互
    def _insert_selected(self):
        sel = self.listbox.curselection()
        if not sel: return
        text = self.listbox.get(sel[0])
        self.on_pick(text)

    # 摆位
    def _show_at(self, x: int, y: int):
        self.win.geometry(f"{self.width}x{self.height}+{x}+{y}")
        if not self.visible:
            self.win.deiconify()
            self.visible = True
        self.win.lift()
        try: set_noactivate(self.win.winfo_id())
        except: pass

    def _hide(self):
        if self.visible:
            try: self.win.withdraw()
            except: pass
            self.visible = False

    # --- 尺寸拖拽实现 ---
    def _on_motion(self, e):
        try:
            x, y = e.x, e.y
            w, h = self.width, self.height
            t = self.edge_thickness
            near_right = (w - t) <= x <= w
            near_bottom = (h - t) <= y <= h
            if near_right and near_bottom:
                self.win.config(cursor="size_nw_se")
                self._resize_mode = 'corner'
            elif near_right:
                self.win.config(cursor="size_we")
                self._resize_mode = 'right'
            elif near_bottom:
                self.win.config(cursor="size_ns")
                self._resize_mode = 'bottom'
            else:
                self.win.config(cursor="")
                self._resize_mode = None
        except Exception:
            pass

    def _on_press(self, e):
        if self._resize_mode:
            self._resizing = True
            self._press_x, self._press_y = e.x_root, e.y_root
            self._start_w, self._start_h = self.width, self.height

    def _on_drag(self, e):
        if not self._resizing or not self._resize_mode:
            return
        dx = e.x_root - self._press_x
        dy = e.y_root - self._press_y
        sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
        if self._resize_mode in ('right', 'corner'):
            self.width = max(200, min(sw, self._start_w + dx))
        if self._resize_mode in ('bottom', 'corner'):
            self.height = max(80, min(sh, self._start_h + dy))
        # 当前位置保持，只更新大小
        try:
            geo = self.win.geometry()
            # geo like: '700x150+X+Y'
            parts = geo.split('+')
            size_part = parts[0]
            x = int(parts[1]) if len(parts) > 1 else 0
            y = int(parts[2]) if len(parts) > 2 else 0
            self.win.geometry(f"{int(self.width)}x{int(self.height)}+{x}+{y}")
        except Exception:
            pass

    def _on_release(self, e):
        if self._resizing:
            self._resizing = False
            save_user_size(int(self.width), int(self.height))

    def _adsorb_tick(self):
        try:
            user32 = ctypes.windll.user32
            # 前台窗口
            fg_hwnd = int(user32.GetForegroundWindow())
            # 选定目标：若锁定则目标为锁定句柄；否则以关键词匹配前台窗口
            target_hwnd = self.lock_hwnd if self.lock_hwnd else fg_hwnd

            # 判断是否需要显示：
            should_show = False
            if self.lock_hwnd:
                # 仅当锁定目标就是前台窗口时显示
                should_show = (fg_hwnd != 0 and fg_hwnd == self.lock_hwnd)
            else:
                # 未锁定时，只有当前台窗口标题命中关键词才显示
                buf = ctypes.create_unicode_buffer(512)
                if fg_hwnd:
                    user32.GetWindowTextW(fg_hwnd, buf, 512)
                title = buf.value or ""
                should_show = any(k in title for k in self.target_keywords)

            # 获取坐标并决定显示/隐藏
            class RECT(ctypes.Structure):
                _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long), ("right", ctypes.c_long), ("bottom", ctypes.c_long)]
            rc = RECT()
            if should_show and target_hwnd and user32.GetWindowRect(target_hwnd, ctypes.byref(rc)):
                sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
                # 底部吸附 + X 取“窗口右半区的中心点”
                cx = (rc.left + rc.right) / 2.0
                right_center = (cx + rc.right) / 2.0
                x = int(right_center - self.width / 2.0) - 200  # 左移 200 像素（整体右移 300）
                if x < 0: x = 0
                if x + self.width > sw: x = sw - self.width
                y = max(0, min(sh - self.height - self.margin, rc.bottom + self.margin))
                self._show_at(int(x), int(y))
            else:
                self._hide()
        except Exception:
            pass
        finally:
            self.root.after(150, self._adsorb_tick)

# ---------------- 主流程 ----------------
class App:
    def __init__(self):
        self.ui = SuggestUI()
        self.phrases = load_phrases()
        self.context = ""   # 从剪贴板捕获的上下文
        keyboard.add_hotkey(HOTKEY_SHOW, self.show_suggest)
        keyboard.add_hotkey(HOTKEY_RELOAD, self.reload_phrases)
        keyboard.add_hotkey(HOTKEY_TOGGLE_AUTOSEND, self.toggle_autosend)
        # 常驻 Dock（不限制 5 条，自动吸附）
        self.dock = DockUI(self.ui.root, self._insert_text, self.phrases, TARGET_KEYWORDS)

    # 删除捕获上下文快捷键；保留按需展示逻辑

    def show_suggest(self):
        # 如果未手动捕获，就直接用当前剪贴板
        ctx = self.context or (pyperclip.paste() or "")
        recs = recommend(ctx, self.phrases, TOP_K) if ctx.strip() else self.phrases[:TOP_K]
        self.ui.show(recs)

    def reload_phrases(self):
        self.phrases = load_phrases()
        try: self.dock.set_phrases(self.phrases)
        except: pass
        self.toast("已重载话术库")

    def toggle_autosend(self):
        self.ui.auto_send = not self.ui.auto_send
        self.toast(f"自动发送：{'开' if self.ui.auto_send else '关'}")

    # 简单气泡（窗口标题提示）
    def toast(self, msg: str):
        try:
            self.ui.win.title(f"quickreply — {msg}")
            def clear(): 
                time.sleep(1.2)
                self.ui.win.title("quickreply_suggest")
            threading.Thread(target=clear, daemon=True).start()
        except: pass

    def run(self):
        self.ui.loop()

    # Dock 插入实现（沿用剪贴板粘贴方式）
    def _insert_text(self, text: str):
        try:
            old = pyperclip.paste()
        except Exception:
            old = None
        try:
            pyperclip.copy(text)
            time.sleep(0.05)
            keyboard.send("ctrl+v")
            if self.ui.auto_send:
                time.sleep(0.02)
                keyboard.send("enter")
        finally:
            if old is not None:
                def restore():
                    time.sleep(0.2)
                    try: pyperclip.copy(old)
                    except: pass
                threading.Thread(target=restore, daemon=True).start()

if __name__ == "__main__":
    print("热键：")
    print(f"  {HOTKEY_SHOW}       弹出推荐（Alt+1..5 选择，或鼠标点击）")
    print(f"  {HOTKEY_RELOAD}      重载 phrases.json")
    print(f"  {HOTKEY_TOGGLE_AUTOSEND}  切换插入后自动回车")
    print("提示：若目标应用为管理员运行，请以管理员权限运行本脚本。")
    App().run()
