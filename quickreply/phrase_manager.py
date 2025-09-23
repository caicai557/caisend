"""
话术管理器 - 支持批量导入和管理
"""
import json
import csv
import sqlite3
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import hashlib
import time

class PhraseManager:
    """话术管理器"""
    
    def __init__(self, db_path: str = "data/quickreply.db", phrases_json: str = "phrases.json"):
        self.db_path = db_path
        self.phrases_json = phrases_json
        self._ensure_database()
    
    def _ensure_database(self):
        """确保数据库存在并创建表"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        
        # 创建话术表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS phrases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phrase_id TEXT UNIQUE,
                template TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                tags TEXT,  -- JSON格式存储标签
                usage_count INTEGER DEFAULT 0,
                last_used INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s','now')*1000),
                updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
            )
        """)
        
        # 创建索引
        conn.execute("CREATE INDEX IF NOT EXISTS idx_phrases_category ON phrases(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_phrases_usage ON phrases(usage_count)")
        
        conn.commit()
        conn.close()
    
    def bulk_import_from_json(self, file_path: str = None) -> int:
        """从JSON文件批量导入话术"""
        if file_path is None:
            file_path = self.phrases_json
            
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            return 0
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            conn = sqlite3.connect(self.db_path)
            imported_count = 0
            
            for item in data:
                if isinstance(item, dict):
                    phrase_id = item.get('id', self._generate_id(item.get('tpl', '')))
                    template = item.get('tpl', '')
                    category = item.get('category', 'general')
                    tags = json.dumps(item.get('tags', []))
                    
                    conn.execute("""
                        INSERT OR REPLACE INTO phrases 
                        (phrase_id, template, category, tags, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                    """, (phrase_id, template, category, tags, int(time.time() * 1000)))
                    imported_count += 1
                elif isinstance(item, str):
                    # 简单字符串格式
                    phrase_id = self._generate_id(item)
                    conn.execute("""
                        INSERT OR REPLACE INTO phrases 
                        (phrase_id, template, updated_at)
                        VALUES (?, ?, ?)
                    """, (phrase_id, item, int(time.time() * 1000)))
                    imported_count += 1
            
            conn.commit()
            conn.close()
            
            print(f"成功导入 {imported_count} 条话术")
            return imported_count
            
        except Exception as e:
            print(f"导入失败: {e}")
            return 0
    
    def bulk_import_from_csv(self, file_path: str) -> int:
        """从CSV文件批量导入话术"""
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            return 0
            
        try:
            conn = sqlite3.connect(self.db_path)
            imported_count = 0
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    phrase_id = row.get('id') or self._generate_id(row.get('template', ''))
                    template = row.get('template', '')
                    category = row.get('category', 'general')
                    tags = json.dumps(row.get('tags', '').split(',') if row.get('tags') else [])
                    
                    if template:
                        conn.execute("""
                            INSERT OR REPLACE INTO phrases 
                            (phrase_id, template, category, tags, updated_at)
                            VALUES (?, ?, ?, ?, ?)
                        """, (phrase_id, template, category, tags, int(time.time() * 1000)))
                        imported_count += 1
            
            conn.commit()
            conn.close()
            
            print(f"从CSV成功导入 {imported_count} 条话术")
            return imported_count
            
        except Exception as e:
            print(f"CSV导入失败: {e}")
            return 0
    
    def bulk_import_from_text(self, file_path: str, category: str = "imported") -> int:
        """从文本文件批量导入话术（每行一条）"""
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            return 0
            
        try:
            conn = sqlite3.connect(self.db_path)
            imported_count = 0
            
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    template = line.strip()
                    if template:
                        phrase_id = self._generate_id(template)
                        conn.execute("""
                            INSERT OR REPLACE INTO phrases 
                            (phrase_id, template, category, updated_at)
                            VALUES (?, ?, ?, ?)
                        """, (phrase_id, template, category, int(time.time() * 1000)))
                        imported_count += 1
            
            conn.commit()
            conn.close()
            
            print(f"从文本文件成功导入 {imported_count} 条话术")
            return imported_count
            
        except Exception as e:
            print(f"文本导入失败: {e}")
            return 0
    
    def add_phrase(self, template: str, category: str = "general", tags: List[str] = None) -> bool:
        """添加单条话术"""
        try:
            phrase_id = self._generate_id(template)
            tags_json = json.dumps(tags or [])
            
            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                INSERT OR REPLACE INTO phrases 
                (phrase_id, template, category, tags, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (phrase_id, template, category, tags_json, int(time.time() * 1000)))
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            print(f"添加话术失败: {e}")
            return False
    
    def get_phrases_by_category(self, category: str = None) -> List[Dict]:
        """按分类获取话术"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        if category:
            cursor = conn.execute("""
                SELECT * FROM phrases WHERE category = ? 
                ORDER BY usage_count DESC, updated_at DESC
            """, (category,))
        else:
            cursor = conn.execute("""
                SELECT * FROM phrases 
                ORDER BY usage_count DESC, updated_at DESC
            """)
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def search_phrases(self, query: str, limit: int = 10) -> List[Dict]:
        """搜索话术"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        cursor = conn.execute("""
            SELECT * FROM phrases 
            WHERE template LIKE ? OR category LIKE ?
            ORDER BY usage_count DESC, updated_at DESC
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", limit))
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def update_usage(self, phrase_id: str):
        """更新使用统计"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            UPDATE phrases 
            SET usage_count = usage_count + 1, 
                last_used = ?
            WHERE phrase_id = ?
        """, (int(time.time() * 1000), phrase_id))
        conn.commit()
        conn.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        conn = sqlite3.connect(self.db_path)
        
        # 总数统计
        total = conn.execute("SELECT COUNT(*) FROM phrases").fetchone()[0]
        
        # 分类统计
        categories = conn.execute("""
            SELECT category, COUNT(*) as count 
            FROM phrases 
            GROUP BY category 
            ORDER BY count DESC
        """).fetchall()
        
        # 最常用话术
        top_used = conn.execute("""
            SELECT phrase_id, template, usage_count 
            FROM phrases 
            WHERE usage_count > 0
            ORDER BY usage_count DESC 
            LIMIT 10
        """).fetchall()
        
        conn.close()
        
        return {
            "total_phrases": total,
            "categories": dict(categories),
            "top_used": [{"id": row[0], "template": row[1], "count": row[2]} for row in top_used]
        }
    
    def _generate_id(self, template: str) -> str:
        """生成话术ID"""
        return hashlib.md5(template.encode('utf-8')).hexdigest()[:12]
    
    def export_to_json(self, output_path: str = "phrases_export.json") -> bool:
        """导出话术到JSON文件"""
        try:
            phrases = self.get_phrases_by_category()
            export_data = []
            
            for phrase in phrases:
                export_data.append({
                    "id": phrase["phrase_id"],
                    "tpl": phrase["template"],
                    "category": phrase["category"],
                    "tags": json.loads(phrase["tags"]) if phrase["tags"] else [],
                    "usage_count": phrase["usage_count"]
                })
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            print(f"成功导出 {len(export_data)} 条话术到 {output_path}")
            return True
            
        except Exception as e:
            print(f"导出失败: {e}")
            return False

if __name__ == "__main__":
    # 测试代码
    manager = PhraseManager()
    
    # 从现有phrases.json导入
    count = manager.bulk_import_from_json()
    print(f"导入了 {count} 条话术")
    
    # 显示统计信息
    stats = manager.get_stats()
    print("统计信息:", stats)
