"""
话术管理界面 - 支持批量导入和管理
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext, TclError
import threading
import json
import queue
from typing import Dict, List, Any
from ..phrase_manager import PhraseManager
from ..config_manager import ConfigManager


class PhraseManagerUI:
    """话术管理界面"""
    
    def __init__(self, parent=None):
        self.parent = parent
        self.phrase_manager = PhraseManager()
        
        # 配置管理器
        self.config_manager = ConfigManager()
        config = self.config_manager.load()
        
        # API端点配置
        api_endpoints = config["app"]["api_endpoints"]
        self.phrases_url = api_endpoints.get("phrases", "http://127.0.0.1:7788/phrases")
        self.ingest_url = api_endpoints.get("ingest", "http://127.0.0.1:7788/ingest")
        
        self.window = None
        self.phrases_tree = None
        self.search_var = None
        self.category_var = None
        self.stats_labels = {}
        self._data_queue = queue.Queue()  # 用于线程间数据传递
        
    def show(self):
        """显示话术管理窗口"""
        if self.window is not None:
            self.window.lift()
            return
            
        self.window = tk.Toplevel(self.parent) if self.parent else tk.Tk()
        self.window.title("话术管理器")
        self.window.geometry("900x700")
        self.window.configure(bg="#f0f0f0")
        
        # 创建界面
        self._create_widgets()
        self._load_data()
        
        # 窗口关闭事件
        self.window.protocol("WM_DELETE_WINDOW", self._on_close)
    
    def _create_widgets(self):
        """创建界面组件"""
        # 主框架
        main_frame = ttk.Frame(self.window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 顶部工具栏
        self._create_toolbar(main_frame)
        
        # 中间内容区域
        content_frame = ttk.Frame(main_frame)
        content_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        
        # 左侧：话术列表
        self._create_phrases_list(content_frame)
        
        # 右侧：详情和操作
        self._create_details_panel(content_frame)
        
        # 底部状态栏
        self._create_status_bar(main_frame)
    
    def _create_toolbar(self, parent):
        """创建工具栏"""
        toolbar = ttk.Frame(parent)
        toolbar.pack(fill=tk.X, pady=(0, 10))
        
        # 导入按钮组
        import_frame = ttk.LabelFrame(toolbar, text="批量导入")
        import_frame.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(import_frame, text="从JSON导入", 
                  command=self._import_from_json).pack(side=tk.LEFT, padx=2, pady=2)
        ttk.Button(import_frame, text="从CSV导入", 
                  command=self._import_from_csv).pack(side=tk.LEFT, padx=2, pady=2)
        ttk.Button(import_frame, text="从文本导入", 
                  command=self._import_from_text).pack(side=tk.LEFT, padx=2, pady=2)
        
        # 管理按钮组
        manage_frame = ttk.LabelFrame(toolbar, text="管理操作")
        manage_frame.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(manage_frame, text="添加话术", 
                  command=self._add_phrase).pack(side=tk.LEFT, padx=2, pady=2)
        ttk.Button(manage_frame, text="导出JSON", 
                  command=self._export_to_json).pack(side=tk.LEFT, padx=2, pady=2)
        ttk.Button(manage_frame, text="刷新", 
                  command=self._load_data).pack(side=tk.LEFT, padx=2, pady=2)
        
        # 搜索框
        search_frame = ttk.Frame(toolbar)
        search_frame.pack(side=tk.RIGHT)
        
        ttk.Label(search_frame, text="搜索:").pack(side=tk.LEFT, padx=(0, 5))
        self.search_var = tk.StringVar()
        search_entry = ttk.Entry(search_frame, textvariable=self.search_var, width=20)
        search_entry.pack(side=tk.LEFT, padx=(0, 5))
        search_entry.bind('<KeyRelease>', self._on_search)
        
        ttk.Button(search_frame, text="搜索", 
                  command=self._search_phrases).pack(side=tk.LEFT)
    
    def _create_phrases_list(self, parent):
        """创建话术列表"""
        # 左侧框架
        left_frame = ttk.Frame(parent)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        # 分类过滤器
        filter_frame = ttk.Frame(left_frame)
        filter_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(filter_frame, text="分类:").pack(side=tk.LEFT)
        self.category_var = tk.StringVar(value="全部")
        category_combo = ttk.Combobox(filter_frame, textvariable=self.category_var, 
                                     values=["全部"], state="readonly", width=15)
        category_combo.pack(side=tk.LEFT, padx=(5, 0))
        category_combo.bind('<<ComboboxSelected>>', self._on_category_change)
        
        # 话术树形列表
        tree_frame = ttk.Frame(left_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        # 创建Treeview
        columns = ("ID", "分类", "使用次数", "最后使用")
        self.phrases_tree = ttk.Treeview(tree_frame, columns=columns, show="tree headings", height=15)
        
        # 设置列标题和宽度
        self.phrases_tree.heading("#0", text="话术内容")
        self.phrases_tree.column("#0", width=300)
        
        for i, col in enumerate(columns):
            self.phrases_tree.heading(col, text=col)
            widths = [100, 80, 80, 120]
            self.phrases_tree.column(col, width=widths[i])
        
        # 添加滚动条
        scrollbar_y = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.phrases_tree.yview)
        scrollbar_x = ttk.Scrollbar(tree_frame, orient=tk.HORIZONTAL, command=self.phrases_tree.xview)
        self.phrases_tree.configure(yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)
        
        # 布局
        self.phrases_tree.grid(row=0, column=0, sticky="nsew")
        scrollbar_y.grid(row=0, column=1, sticky="ns")
        scrollbar_x.grid(row=1, column=0, sticky="ew")
        
        tree_frame.grid_rowconfigure(0, weight=1)
        tree_frame.grid_columnconfigure(0, weight=1)
        
        # 绑定选择事件
        self.phrases_tree.bind('<<TreeviewSelect>>', self._on_phrase_select)
    
    def _create_details_panel(self, parent):
        """创建详情面板"""
        # 右侧框架
        right_frame = ttk.Frame(parent)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        right_frame.configure(width=300)
        
        # 话术详情
        details_frame = ttk.LabelFrame(right_frame, text="话术详情")
        details_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # 话术内容
        ttk.Label(details_frame, text="话术内容:").pack(anchor=tk.W, padx=5, pady=(5, 0))
        self.content_text = scrolledtext.ScrolledText(details_frame, height=8, wrap=tk.WORD)
        self.content_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 分类和标签
        info_frame = ttk.Frame(details_frame)
        info_frame.pack(fill=tk.X, padx=5, pady=(0, 5))
        
        ttk.Label(info_frame, text="分类:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.category_entry = ttk.Entry(info_frame, width=20)
        self.category_entry.grid(row=0, column=1, padx=(5, 0), pady=2, sticky=tk.EW)
        
        ttk.Label(info_frame, text="标签:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.tags_entry = ttk.Entry(info_frame, width=20)
        self.tags_entry.grid(row=1, column=1, padx=(5, 0), pady=2, sticky=tk.EW)
        
        info_frame.grid_columnconfigure(1, weight=1)
        
        # 操作按钮
        button_frame = ttk.Frame(details_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(button_frame, text="保存修改", 
                  command=self._save_phrase).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="删除话术", 
                  command=self._delete_phrase).pack(side=tk.LEFT, padx=(0, 5))
        
        # 统计信息
        stats_frame = ttk.LabelFrame(right_frame, text="统计信息")
        stats_frame.pack(fill=tk.X)
        
        self.stats_labels = {
            "total": ttk.Label(stats_frame, text="总话术数: 0"),
            "categories": ttk.Label(stats_frame, text="分类数: 0"),
            "most_used": ttk.Label(stats_frame, text="最常用: -")
        }
        
        for label in self.stats_labels.values():
            label.pack(anchor=tk.W, padx=5, pady=2)
    
    def _create_status_bar(self, parent):
        """创建状态栏"""
        self.status_bar = ttk.Label(parent, text="就绪", relief=tk.SUNKEN)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X, pady=(10, 0))
    
    def _import_from_json(self):
        """从JSON文件导入"""
        file_path = filedialog.askopenfilename(
            title="选择JSON文件",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if file_path:
            self._update_status("正在导入JSON文件...")
            threading.Thread(target=self._do_import_json, args=(file_path,), daemon=True).start()
    
    def _do_import_json(self, file_path):
        """执行JSON导入"""
        try:
            count = self.phrase_manager.bulk_import_from_json(file_path)
            self._data_queue.put(("import_success", count, "JSON"))
        except Exception as e:
            self._data_queue.put(("import_error", f"JSON导入失败: {str(e)}"))
    
    def _import_from_csv(self):
        """从CSV文件导入"""
        file_path = filedialog.askopenfilename(
            title="选择CSV文件",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        
        if file_path:
            self._update_status("正在导入CSV文件...")
            threading.Thread(target=self._do_import_csv, args=(file_path,), daemon=True).start()
    
    def _do_import_csv(self, file_path):
        """执行CSV导入"""
        try:
            count = self.phrase_manager.bulk_import_from_csv(file_path)
            self._data_queue.put(("import_success", count, "CSV"))
        except Exception as e:
            self._data_queue.put(("import_error", f"CSV导入失败: {str(e)}"))
    
    def _import_from_text(self):
        """从文本文件导入"""
        file_path = filedialog.askopenfilename(
            title="选择文本文件",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        
        if file_path:
            self._update_status("正在导入文本文件...")
            threading.Thread(target=self._do_import_text, args=(file_path,), daemon=True).start()
    
    def _do_import_text(self, file_path):
        """执行文本导入"""
        try:
            count = self.phrase_manager.bulk_import_from_text(file_path)
            self._data_queue.put(("import_success", count, "文本"))
        except Exception as e:
            self._data_queue.put(("import_error", f"文本导入失败: {str(e)}"))
    
    def _import_complete(self, count, file_type):
        """导入完成"""
        messagebox.showinfo("导入完成", f"成功从{file_type}文件导入 {count} 条话术")
        self._load_data()
        self._update_status("导入完成")
    
    def _export_to_json(self):
        """导出到JSON文件"""
        file_path = filedialog.asksaveasfilename(
            title="保存JSON文件",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if file_path:
            if self.phrase_manager.export_to_json(file_path):
                messagebox.showinfo("导出完成", f"话术已导出到: {file_path}")
            else:
                messagebox.showerror("导出失败", "导出过程中发生错误")
    
    def _add_phrase(self):
        """添加新话术"""
        dialog = AddPhraseDialog(self.window)
        if dialog.result:
            template, category, tags = dialog.result
            if self.phrase_manager.add_phrase(template, category, tags):
                messagebox.showinfo("添加成功", "话术已添加")
                self._load_data()
            else:
                messagebox.showerror("添加失败", "添加话术时发生错误")
    
    def _load_data(self):
        """加载数据"""
        self._update_status("正在加载数据...")
        threading.Thread(target=self._do_load_data, daemon=True).start()
        # 启动队列轮询
        self._poll_queue()
    
    def _do_load_data(self):
        """执行数据加载（后台线程）"""
        try:
            import requests  # pyright: ignore[reportMissingModuleSource]
            # 从推荐服务获取话术数据
            response = requests.get(self.phrases_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                phrases = data.get('phrases', [])
                
                # 转换数据格式以兼容现有界面
                formatted_phrases = []
                for phrase in phrases:
                    formatted_phrases.append({
                        'phrase_id': phrase['id'],
                        'template': phrase['content'],
                        'category': phrase.get('source', '默认'),
                        'created_at': phrase.get('created_at', ''),
                        'last_used': None,
                        'use_count': 0,
                        'tags': []
                    })
                
                # 模拟统计信息
                stats = {
                    'total_phrases': len(formatted_phrases),
                    'categories': len(set(p['category'] for p in formatted_phrases)),
                    'most_used': formatted_phrases[0]['template'][:30] + '...' if formatted_phrases else '-'
                }
                
                # 通过队列传递结果到主线程
                self._data_queue.put(("success", formatted_phrases, stats))
            else:
                self._data_queue.put(("error", f"获取话术失败：HTTP {response.status_code}"))
            
        except requests.exceptions.RequestException as e:
            self._data_queue.put(("error", f"网络请求失败: {str(e)}"))
        except Exception as e:
            # 通过队列传递错误到主线程
            self._data_queue.put(("error", str(e)))
    
    def _poll_queue(self):
        """轮询队列并在主线程处理结果"""
        try:
            while True:
                result = self._data_queue.get_nowait()
                if result[0] == "success":
                    _, phrases, stats = result
                    self._update_phrases_list(phrases, stats)
                elif result[0] == "error":
                    _, error_msg = result
                    messagebox.showerror("加载失败", f"数据加载失败: {error_msg}")
                elif result[0] == "import_success":
                    _, count, file_type = result
                    self._import_complete(count, file_type)
                elif result[0] == "import_error":
                    _, error_msg = result
                    messagebox.showerror("导入失败", error_msg)
                elif result[0] == "search_success":
                    _, results = result
                    self._update_search_results(results)
                elif result[0] == "search_error":
                    _, error_msg = result
                    messagebox.showerror("搜索失败", error_msg)
                elif result[0] == "filter_success":
                    _, phrases, stats = result
                    self._update_phrases_list(phrases, stats)
                elif result[0] == "filter_error":
                    _, error_msg = result
                    messagebox.showerror("过滤失败", error_msg)
        except queue.Empty:
            pass
        finally:
            # 继续轮询 - 增强窗口状态检查
            self._schedule_poll()
    
    def _schedule_poll(self):
        """安全的轮询调度方法 - 窗口生命周期管理"""
        try:
            if self.window and self.window.winfo_exists():
                self.window.after(100, self._poll_queue)
        except (RuntimeError, TclError) as e:
            # 窗口已销毁或线程错误，停止轮询
            print(f"[UI] 轮询停止: {e}")
    
    def _update_phrases_list(self, phrases: List[Dict], stats: Dict):
        """更新话术列表"""
        # 清空现有数据
        for item in self.phrases_tree.get_children():
            self.phrases_tree.delete(item)
        
        # 添加话术数据
        for phrase in phrases:
            # 格式化时间
            last_used = "从未使用"
            if phrase["last_used"]:
                import datetime
                dt = datetime.datetime.fromtimestamp(phrase["last_used"] / 1000)
                last_used = dt.strftime("%Y-%m-%d %H:%M")
            
            self.phrases_tree.insert("", tk.END, 
                                   text=phrase["template"][:50] + ("..." if len(phrase["template"]) > 50 else ""),
                                   values=(phrase["phrase_id"], phrase["category"], 
                                          phrase["usage_count"], last_used),
                                   tags=(phrase["phrase_id"],))
        
        # 更新分类下拉框
        categories = ["全部"] + list(stats["categories"].keys())
        category_combo = None
        for widget in self.window.winfo_children():
            if hasattr(widget, 'winfo_children'):
                for child in widget.winfo_children():
                    if isinstance(child, ttk.Combobox) and child.cget('textvariable') == str(self.category_var):
                        category_combo = child
                        break
        
        if category_combo:
            category_combo['values'] = categories
        
        # 更新统计信息
        self._update_stats(stats)
        
        self._update_status("数据加载完成")
    
    def _update_stats(self, stats: Dict):
        """更新统计信息"""
        self.stats_labels["total"].config(text=f"总话术数: {stats['total_phrases']}")
        self.stats_labels["categories"].config(text=f"分类数: {len(stats['categories'])}")
        
        if stats["top_used"]:
            most_used = stats["top_used"][0]
            self.stats_labels["most_used"].config(
                text=f"最常用: {most_used['template'][:20]}... ({most_used['count']}次)"
            )
        else:
            self.stats_labels["most_used"].config(text="最常用: -")
    
    def _on_search(self, event):
        """搜索输入事件"""
        # 延迟搜索，避免频繁查询
        if hasattr(self, '_search_timer'):
            self.window.after_cancel(self._search_timer)
        
        self._search_timer = self.window.after(500, self._search_phrases)
    
    def _search_phrases(self):
        """搜索话术"""
        query = self.search_var.get().strip()
        if not query:
            self._load_data()
            return
        
        self._update_status("正在搜索...")
        threading.Thread(target=self._do_search, args=(query,), daemon=True).start()
    
    def _do_search(self, query):
        """执行搜索"""
        try:
            results = self.phrase_manager.search_phrases(query)
            self._data_queue.put(("search_success", results))
        except Exception as e:
            self._data_queue.put(("search_error", f"搜索失败: {str(e)}"))
    
    def _update_search_results(self, results: List[Dict]):
        """更新搜索结果"""
        # 清空现有数据
        for item in self.phrases_tree.get_children():
            self.phrases_tree.delete(item)
        
        # 添加搜索结果
        for phrase in results:
            last_used = "从未使用"
            if phrase["last_used"]:
                import datetime
                dt = datetime.datetime.fromtimestamp(phrase["last_used"] / 1000)
                last_used = dt.strftime("%Y-%m-%d %H:%M")
            
            self.phrases_tree.insert("", tk.END,
                                   text=phrase["template"][:50] + ("..." if len(phrase["template"]) > 50 else ""),
                                   values=(phrase["phrase_id"], phrase["category"],
                                          phrase["usage_count"], last_used),
                                   tags=(phrase["phrase_id"],))
        
        self._update_status(f"找到 {len(results)} 条匹配结果")
    
    def _on_category_change(self, event):
        """分类变更事件"""
        category = self.category_var.get()
        if category == "全部":
            self._load_data()
        else:
            self._filter_by_category(category)
    
    def _filter_by_category(self, category):
        """按分类过滤"""
        self._update_status("正在过滤...")
        threading.Thread(target=self._do_filter, args=(category,), daemon=True).start()
    
    def _do_filter(self, category):
        """执行分类过滤"""
        try:
            phrases = self.phrase_manager.get_phrases_by_category(category)
            stats = self.phrase_manager.get_stats()
            self._data_queue.put(("filter_success", phrases, stats))
        except Exception as e:
            self._data_queue.put(("filter_error", f"分类过滤失败: {str(e)}"))
    
    def _on_phrase_select(self, event):
        """话术选择事件"""
        selection = self.phrases_tree.selection()
        if not selection:
            return
        
        item = self.phrases_tree.item(selection[0])
        phrase_id = item["values"][0]
        
        # 获取话术详情
        phrases = self.phrase_manager.get_phrases_by_category()
        phrase = next((p for p in phrases if p["phrase_id"] == phrase_id), None)
        
        if phrase:
            self._show_phrase_details(phrase)
    
    def _show_phrase_details(self, phrase: Dict):
        """显示话术详情"""
        self.content_text.delete(1.0, tk.END)
        self.content_text.insert(1.0, phrase["template"])
        
        self.category_entry.delete(0, tk.END)
        self.category_entry.insert(0, phrase["category"])
        
        self.tags_entry.delete(0, tk.END)
        if phrase["tags"]:
            tags = json.loads(phrase["tags"])
            self.tags_entry.insert(0, ", ".join(tags))
        
        # 存储当前编辑的话术ID
        self._current_phrase_id = phrase["phrase_id"]
    
    def _save_phrase(self):
        """保存话术修改"""
        if not hasattr(self, '_current_phrase_id'):
            messagebox.showwarning("提示", "请先选择要修改的话术")
            return
        
        # 实现保存逻辑
        try:
            # 获取编辑框内容
            content = self.edit_text.get("1.0", tk.END).strip()
            if not content:
                messagebox.showwarning("提示", "话术内容不能为空")
                return
            
            # 调用推荐服务的更新接口
            import requests  # pyright: ignore[reportMissingModuleSource]
            response = requests.post(
                self.ingest_url,
                json={
                    "message": content,
                    "chatTitle": "手动编辑",
                    "source": "phrase_manager"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                messagebox.showinfo("成功", "话术保存成功！")
                self._update_status("话术已保存")
                # 刷新列表
                self._load_data()
            else:
                messagebox.showerror("错误", f"保存失败：{response.text}")
                
        except requests.exceptions.RequestException as e:
            messagebox.showerror("错误", f"网络请求失败：{str(e)}")
        except Exception as e:
            messagebox.showerror("错误", f"保存失败：{str(e)}")
    
    def _delete_phrase(self):
        """删除话术"""
        if not hasattr(self, '_current_phrase_id'):
            messagebox.showwarning("提示", "请先选择要删除的话术")
            return
        
        if messagebox.askyesno("确认删除", "确定要删除选中的话术吗？"):
            # 实现删除逻辑
            try:
                import requests  # pyright: ignore[reportMissingModuleSource]
                response = requests.delete(
                    f"{self.phrases_url}/{self._current_phrase_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    messagebox.showinfo("成功", "话术删除成功！")
                    self._update_status("话术已删除")
                    # 清空编辑框
                    self.edit_text.delete("1.0", tk.END)
                    # 刷新列表
                    self._load_data()
                    # 清除当前选择
                    if hasattr(self, '_current_phrase_id'):
                        delattr(self, '_current_phrase_id')
                elif response.status_code == 404:
                    messagebox.showwarning("提示", "话术不存在或已被删除")
                else:
                    messagebox.showerror("错误", f"删除失败：{response.text}")
                    
            except requests.exceptions.RequestException as e:
                messagebox.showerror("错误", f"网络请求失败：{str(e)}")
            except Exception as e:
                messagebox.showerror("错误", f"删除失败：{str(e)}")
    
    def _update_status(self, message: str):
        """更新状态栏"""
        if self.status_bar:
            self.status_bar.config(text=message)
    
    def _on_close(self):
        """窗口关闭事件"""
        self.window.destroy()
        self.window = None


class AddPhraseDialog:
    """添加话术对话框"""
    
    def __init__(self, parent):
        self.result = None
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("添加话术")
        self.dialog.geometry("500x400")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self._create_widgets()
        
        # 居中显示
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (self.dialog.winfo_width() // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (self.dialog.winfo_height() // 2)
        self.dialog.geometry(f"+{x}+{y}")
        
        self.dialog.wait_window()
    
    def _create_widgets(self):
        """创建对话框组件"""
        main_frame = ttk.Frame(self.dialog)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # 话术内容
        ttk.Label(main_frame, text="话术内容:").pack(anchor=tk.W)
        self.content_text = scrolledtext.ScrolledText(main_frame, height=10)
        self.content_text.pack(fill=tk.BOTH, expand=True, pady=(5, 10))
        
        # 分类
        info_frame = ttk.Frame(main_frame)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(info_frame, text="分类:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        self.category_var = tk.StringVar(value="general")
        category_entry = ttk.Entry(info_frame, textvariable=self.category_var, width=20)
        category_entry.grid(row=0, column=1, sticky=tk.EW)
        
        ttk.Label(info_frame, text="标签:").grid(row=1, column=0, sticky=tk.W, padx=(0, 10), pady=(5, 0))
        self.tags_var = tk.StringVar()
        tags_entry = ttk.Entry(info_frame, textvariable=self.tags_var, width=20)
        tags_entry.grid(row=1, column=1, sticky=tk.EW, pady=(5, 0))
        
        info_frame.grid_columnconfigure(1, weight=1)
        
        # 按钮
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(10, 0))
        
        ttk.Button(button_frame, text="确定", command=self._ok).pack(side=tk.RIGHT, padx=(5, 0))
        ttk.Button(button_frame, text="取消", command=self._cancel).pack(side=tk.RIGHT)
    
    def _ok(self):
        """确定按钮"""
        content = self.content_text.get(1.0, tk.END).strip()
        if not content:
            messagebox.showwarning("提示", "请输入话术内容")
            return
        
        category = self.category_var.get().strip() or "general"
        tags_str = self.tags_var.get().strip()
        tags = [tag.strip() for tag in tags_str.split(",") if tag.strip()] if tags_str else []
        
        self.result = (content, category, tags)
        self.dialog.destroy()
    
    def _cancel(self):
        """取消按钮"""
        self.dialog.destroy()


if __name__ == "__main__":
    # 测试界面
    root = tk.Tk()
    root.withdraw()  # 隐藏主窗口
    
    ui = PhraseManagerUI()
    ui.show()
    
    root.mainloop()
