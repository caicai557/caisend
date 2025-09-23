from __future__ import annotations

import tkinter as tk
from typing import Callable, List

from ..platform.win32 import get_foreground_hwnd, get_window_rect, get_window_title, set_noactivate


class DockUI:
    def __init__(self, root: tk.Tk, on_pick: Callable[[str], None] | None, phrases: List[str], target_keywords: List[str]):
        self.root = root
        self.on_pick = on_pick or (lambda s: None)
        self.phrases = phrases
        self.target_keywords = target_keywords

        self.win = tk.Toplevel(self.root)
        self.win.overrideredirect(True)
        self.win.configure(bg="#1e1e1e")
        self.win.attributes("-topmost", True)
        try: set_noactivate(self.win.winfo_id())
        except: pass
        self.visible = False
        self.win.withdraw()

        self.width = 700
        self.height = 150
        self.margin = 10

        rootf = tk.Frame(self.win, bg="#1e1e1e")
        rootf.pack(fill="both", expand=True)
        self.listbox = tk.Listbox(rootf, activestyle="dotbox")
        self.listbox.pack(side="left", fill="both", expand=True, padx=8, pady=8)
        self.listbox.bind("<Double-Button-1>", lambda e: self._insert_selected())
        self.listbox.bind("<Return>", lambda e: self._insert_selected())
        self.refresh(self.phrases)

        self._tick()

    def refresh(self, items: List[str]):
        self.phrases = items
        self.listbox.delete(0, tk.END)
        for s in items:
            self.listbox.insert(tk.END, s)

    def _insert_selected(self):
        sel = self.listbox.curselection()
        if not sel: return
        self.on_pick(self.listbox.get(sel[0]))

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
            self.win.withdraw()
            self.visible = False

    def _tick(self):
        try:
            hwnd = get_foreground_hwnd()
            title = get_window_title(hwnd)
            show = any(k in title for k in self.target_keywords)
            rc = get_window_rect(hwnd) if show else None
            if show and rc:
                sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
                cx = (rc.left + rc.right) / 2.0
                right_center = (cx + rc.right) / 2.0
                x = int(right_center - self.width / 2.0)
                x = max(0, min(sw - self.width, x))
                y = max(0, min(sh - self.height - self.margin, rc.bottom + self.margin))
                self._show_at(x, y)
            else:
                self._hide()
        except Exception:
            pass
        finally:
            self.root.after(150, self._tick)



