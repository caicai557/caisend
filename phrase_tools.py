#!/usr/bin/env python3
"""
话术管理独立工具集 - 统一API访问版本
用法：
  python phrase_tools.py --help                        # 查看帮助
  python phrase_tools.py import --json file.json       # 导入JSON
  python phrase_tools.py import --csv file.csv         # 导入CSV  
  python phrase_tools.py import --txt file.txt         # 导入文本
  python phrase_tools.py import --telegram result.json # 导入Telegram
  python phrase_tools.py import --all                  # 导入所有示例
  python phrase_tools.py ui                            # 打开管理界面
  python phrase_tools.py stats                         # 显示统计信息

注意：此工具现在使用推荐服务API，请确保推荐服务正在运行
启动服务：cd C:\dev\reply-recosvc && npm run dev
"""

import sys
import argparse
import json
import requests  # pyright: ignore[reportMissingModuleSource]
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from quickreply.service_client import create_service_client, ServiceClientError
from quickreply.config_manager import ConfigManager

def cmd_import(args):
    """批量导入话术"""
    try:
        # 使用配置管理器和服务客户端
        config_manager = ConfigManager()
        config = config_manager.load()
        client = create_service_client(config_manager)
        
        service_path = config.get("app", {}).get("service_path", "C:\\dev\\reply-recosvc")
        start_command = f"cd {service_path} && npm run dev"

        # 检查服务健康状态
        if not client.health_check():
            print("❌ 推荐服务未启动或不可用，请先启动服务")
            print(f"   启动命令: {start_command}")
            return
        
        total_imported = 0
        
        print("🚀 开始批量导入话术...")
        
        if args.json:
            count = client.bulk_import("json", args.json)
            print(f"✅ JSON导入完成: {count} 条")
            total_imported += count
            
        if args.csv:
            count = client.bulk_import("csv", args.csv)
            print(f"✅ CSV导入完成: {count} 条")
            total_imported += count
            
        if args.txt:
            count = client.bulk_import("txt", args.txt)
            print(f"✅ 文本导入完成: {count} 条")
            total_imported += count
            
        if args.telegram:
            count = client.bulk_import("telegram", args.telegram)
            print(f"✅ Telegram导入完成: {count} 条")
            total_imported += count
            
        if args.all:
            sample_files = [
                ('sample_phrases.json', 'json'),
                ('sample_phrases.csv', 'csv'), 
                ('sample_phrases.txt', 'txt')
            ]
            
            for file_path, file_type in sample_files:
                if Path(file_path).exists():
                    count = client.bulk_import(file_type, file_path)
                    print(f"✅ {file_path} 导入完成: {count} 条")
                    total_imported += count
                else:
                    print(f"⚠️ 文件不存在: {file_path}")
        
        if total_imported > 0:
            print(f"\n📊 导入统计:")
            print(f"总计导入: {total_imported} 条话术")
            
            stats = client.get_stats()
            print(f"数据库总计: {stats['total_phrases']} 条话术")
            print(f"分类数量: {len(stats['categories'])} 个")
            
            if stats['categories']:
                print("\n分类统计:")
                for category, count in stats['categories'].items():
                    print(f"  {category}: {count} 条")
                    
            print("\n🎉 导入完成！")
        else:
            print("❌ 没有导入任何数据，请检查文件路径或格式")
            
    except ServiceClientError as e:
        print(f"❌ 服务调用失败: {e}")
        print("   请确保推荐服务正在运行")
    except Exception as e:
        # 根据异常类型提供具体的错误信息
        if isinstance(e, requests.exceptions.ConnectionError):
            print("❌ 无法连接到推荐服务")
            print("   请检查网络连接和服务状态")
            print(f"   启动命令: {start_command}")
        elif isinstance(e, requests.exceptions.Timeout):
            print("❌ 服务响应超时")
            print("   请检查服务性能或增加超时时间")
        elif isinstance(e, json.JSONDecodeError):
            print("❌ 服务返回无效响应")
            print("   可能是服务版本不兼容")
            print("   请检查服务是否正常运行")
        elif isinstance(e, FileNotFoundError):
            print("❌ 指定的文件不存在")
            print("   请检查文件路径是否正确")
        elif isinstance(e, PermissionError):
            print("❌ 文件访问权限不足")
            print("   请检查文件读取权限")
        else:
            print(f"❌ 导入失败: {e}")
            print("   请检查文件格式和内容是否正确")

def cmd_ui(args):
    """打开话术管理界面"""
    try:
        import tkinter as tk
        from quickreply.ui.phrase_manager_ui import PhraseManagerUI
        
        print("🎨 启动话术管理界面...")
        
        # 创建隐藏的根窗口
        root = tk.Tk()
        root.withdraw()
        
        # 创建并显示管理界面
        ui = PhraseManagerUI()
        ui.show()
        
        # 启动事件循环
        root.mainloop()
        
    except ImportError as e:
        print(f"❌ 界面启动失败: {e}")
        print("请确保已安装 tkinter")
    except Exception as e:
        print(f"❌ 界面启动失败: {e}")

def cmd_stats(args):
    """显示话术库统计信息"""
    try:
        # 使用配置管理器和服务客户端
        config_manager = ConfigManager()
        config = config_manager.load()
        client = create_service_client(config_manager)

        service_path = config.get("app", {}).get("service_path", "C:\\dev\\reply-recosvc")
        start_command = f"cd {service_path} && npm run dev"
        
        # 检查服务健康状态
        if not client.health_check():
            print("❌ 推荐服务未启动或不可用，请先启动服务")
            print(f"   启动命令: {start_command}")
            return
        
        stats = client.get_stats()
        
        print("📊 话术库统计信息")
        print("=" * 40)
        print(f"总话术数量: {stats['total_phrases']} 条")
        print(f"分类数量: {len(stats['categories'])} 个")
        
        if stats['categories']:
            print("\n📂 分类详情:")
            for category, count in sorted(stats['categories'].items()):
                percentage = (count / stats['total_phrases'] * 100) if stats['total_phrases'] > 0 else 0
                print(f"  {category:15} {count:4} 条 ({percentage:5.1f}%)")
        
        if stats['total_phrases'] > 0:
            # 显示最近的话术
            recent_phrases = client.get_phrases(limit=3)
            if recent_phrases.get('phrases'):
                print("\n🔥 最新话术:")
                for phrase in recent_phrases['phrases']:
                    content = phrase.get('content', '')[:50]
                    if len(phrase.get('content', '')) > 50:
                        content += "..."
                    print(f"  • {content}")
        else:
            print("\n💡 提示: 数据库为空，可以使用以下命令导入话术:")
            print("  python phrase_tools.py import --all")
            
        # 显示服务健康状态
        metrics = client.get_metrics()
        if metrics:
            print(f"\n🔧 服务状态: 正常运行")
            if 'uptime' in metrics:
                print(f"运行时间: {metrics['uptime']}")
                
    except ServiceClientError as e:
        print(f"❌ 服务调用失败: {e}")
        print("   请确保推荐服务正在运行")
    except Exception as e:
        # 根据异常类型提供具体的错误信息
        if isinstance(e, requests.exceptions.ConnectionError):
            print("❌ 无法连接到推荐服务")
            print("   请检查网络连接和服务状态")
            print(f"   启动命令: {start_command}")
        elif isinstance(e, requests.exceptions.Timeout):
            print("❌ 服务响应超时")
            print("   请检查服务性能或增加超时时间")
        elif isinstance(e, json.JSONDecodeError):
            print("❌ 服务返回无效响应")
            print("   可能是服务版本不兼容")
            print("   请检查服务是否正常运行")
        else:
            print(f"❌ 获取统计信息失败: {e}")
            print("   请检查服务状态和网络连接")

def main():
    parser = argparse.ArgumentParser(
        description="话术管理独立工具集",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python phrase_tools.py import --json sample_phrases.json
  python phrase_tools.py import --telegram result.json
  python phrase_tools.py import --all
  python phrase_tools.py ui
  python phrase_tools.py stats

注意: 需要推荐服务运行 (cd C:\\dev\\reply-recosvc && npm run dev)
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # import 子命令
    import_parser = subparsers.add_parser('import', help='批量导入话术')
    import_parser.add_argument('--json', help='从JSON文件导入')
    import_parser.add_argument('--csv', help='从CSV文件导入') 
    import_parser.add_argument('--txt', help='从文本文件导入')
    import_parser.add_argument('--telegram', help='从Telegram导出文件导入')
    import_parser.add_argument('--all', action='store_true', help='导入所有示例文件')
    import_parser.set_defaults(func=cmd_import)
    
    # ui 子命令
    ui_parser = subparsers.add_parser('ui', help='打开话术管理界面')
    ui_parser.set_defaults(func=cmd_ui)
    
    # stats 子命令  
    stats_parser = subparsers.add_parser('stats', help='显示统计信息')
    stats_parser.set_defaults(func=cmd_stats)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        # 动态加载启动命令并显示在帮助信息中
        try:
            config = ConfigManager().load()
            service_path = config.get("app", {}).get("service_path")
            if service_path:
                print("\n" + "="*50)
                print("🔧 服务启动指南:")
                print(f"   cd {service_path} && npm run dev")
                print("="*50)
        except Exception:
            pass # 配置不存在或错误时，不显示
        return
        
    # 执行对应的命令函数
    args.func(args)

if __name__ == "__main__":
    main()
