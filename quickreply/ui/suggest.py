from __future__ import annotations

import tkinter as tk
from typing import Callable, List

from ..platform.win32 import set_noactivate


class SuggestUI:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.withdraw()
        self.win = tk.Toplevel(self.root)
        self.win.overrideredirect(True)
        self.win.configure(bg="#1e1e1e")
        self.win.attributes("-topmost", True)
        try: set_noactivate(self.win.winfo_id())
        except: pass

        self.frame = tk.Frame(self.win, bg="#1e1e1e")
        self.frame.pack(fill="both", expand=True)
        self.labels: List[tk.Label] = []
        self.visible = False

    def _clear(self) -> None:
        for w in self.labels:
            w.destroy()
        self.labels.clear()

    def show(self, recs: List[str], on_pick: Callable[[str], None] | None = None) -> None:
        self._clear()
        for s in recs:
            row = tk.Frame(self.frame, bg="#1e1e1e")
            row.pack(fill="x", padx=8, pady=4)
            lbl = tk.Label(row, text=s, fg="#ffffff", bg="#1e1e1e", wraplength=520, justify="left")
            lbl.pack(side="left", fill="x", expand=True)
            if on_pick:
                lbl.bind("<Button-1>", lambda e, t=s: on_pick(t))
            self.labels.append(lbl)

        try:
            x, y = self.root.winfo_pointerx(), self.root.winfo_pointery()
        except Exception:
            x, y = 200, 200
        self.win.geometry(f"+{x+16}+{y+20}")
        self.win.deiconify()
        self.win.lift()
        try: set_noactivate(self.win.winfo_id())
        except: pass
        self.visible = True

    def hide(self) -> None:
        if self.visible:
            self.win.withdraw()
            self.visible = False

    def loop(self) -> None:
        self.root.mainloop()



