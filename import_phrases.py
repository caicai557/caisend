#!/usr/bin/env python3
"""
快速话术导入脚本
使用方法：
python import_phrases.py [--json file.json] [--csv file.csv] [--txt file.txt] [--all]
"""
import argparse
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from quickreply.phrase_manager import PhraseManager

def main():
    parser = argparse.ArgumentParser(description='批量导入话术')
    parser.add_argument('--json', help='从JSON文件导入')
    parser.add_argument('--csv', help='从CSV文件导入') 
    parser.add_argument('--txt', help='从文本文件导入')
    parser.add_argument('--all', action='store_true', help='导入所有示例文件')
    parser.add_argument('--db-path', default='data/quickreply.db', help='数据库路径')
    
    args = parser.parse_args()
    
    if not any([args.json, args.csv, args.txt, args.all]):
        parser.print_help()
        return
    
    # 初始化管理器
    manager = PhraseManager(db_path=args.db_path)
    total_imported = 0
    
    print("🚀 开始批量导入话术...")
    
    # 导入JSON
    if args.json:
        count = manager.bulk_import_from_json(args.json)
        print(f"✅ JSON导入完成: {count} 条")
        total_imported += count
    
    # 导入CSV
    if args.csv:
        count = manager.bulk_import_from_csv(args.csv)
        print(f"✅ CSV导入完成: {count} 条")
        total_imported += count
    
    # 导入文本
    if args.txt:
        count = manager.bulk_import_from_text(args.txt)
        print(f"✅ 文本导入完成: {count} 条")
        total_imported += count
    
    # 导入所有示例文件
    if args.all:
        sample_files = [
            ('sample_phrases.json', 'json'),
            ('sample_phrases.csv', 'csv'), 
            ('sample_phrases.txt', 'txt')
        ]
        
        for file_path, file_type in sample_files:
            if Path(file_path).exists():
                if file_type == 'json':
                    count = manager.bulk_import_from_json(file_path)
                elif file_type == 'csv':
                    count = manager.bulk_import_from_csv(file_path)
                elif file_type == 'txt':
                    count = manager.bulk_import_from_text(file_path)
                
                print(f"✅ {file_path} 导入完成: {count} 条")
                total_imported += count
            else:
                print(f"⚠️ 文件不存在: {file_path}")
    
    # 显示统计信息
    print(f"\n📊 导入统计:")
    print(f"总计导入: {total_imported} 条话术")
    
    stats = manager.get_stats()
    print(f"数据库总计: {stats['total_phrases']} 条话术")
    print(f"分类数量: {len(stats['categories'])} 个")
    
    if stats['categories']:
        print("\n分类统计:")
        for category, count in stats['categories'].items():
            print(f"  {category}: {count} 条")
    
    print("\n🎉 导入完成！")

if __name__ == "__main__":
    main()
