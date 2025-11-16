"""Teleflow CLI - Telegram Web 助手命令行界面"""

import argparse
import sys
from typing import Optional
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.config.validator import ConfigValidator


def get_version() -> str:
    """获取版本信息"""
    return "0.1.0"


def create_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog="teleflow",
        description="Telegram Web 助手 - 单账号自动回复系统"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"Teleflow {get_version()}"
    )
    
    # 子命令
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # run 命令
    run_parser = subparsers.add_parser("run", help="运行 Telegram Web 助手")
    run_parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="配置文件路径 (默认: config.yaml)"
    )
    run_parser.add_argument(
        "--account",
        type=str,
        help="指定账号名称 (多账号配置时使用)"
    )
    run_parser.add_argument(
        "--debug",
        action="store_true",
        help="启用调试模式"
    )
    run_parser.add_argument(
        "--show-browser",
        action="store_true",
        help="显示浏览器界面 (非 headless 模式)"
    )
    
    # validate-config 命令
    validate_parser = subparsers.add_parser(
        "validate-config", 
        help="验证配置文件格式"
    )
    validate_parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="配置文件路径 (默认: config.yaml)"
    )
    
    return parser


def validate_config(config_path: str) -> int:
    """验证配置文件
    
    Args:
        config_path: 配置文件路径
        
    Returns:
        int: 0 表示成功，1 表示失败
    """
    try:
        loader = ConfigLoader()
        config = loader.load_from_file(config_path)
        
        print(f"✅ 配置文件验证成功: {config_path}")
        print(f"📋 配置版本: {config.version}")
        print(f"👥 账号数量: {len(config.accounts)}")
        
        for account in config.accounts:
            print(f"   - {account.name}: {len(account.monitor_chats)} 个聊天, {len(account.rules)} 条规则")
        
        if config.default_account:
            print(f"🎯 默认账号: {config.default_account}")
        
        return 0
        
    except FileNotFoundError:
        print(f"❌ 错误: 配置文件不存在: {config_path}")
        return 1
    except Exception as e:
        print(f"❌ 配置验证失败: {e}")
        return 1


def main(argv: Optional[list] = None) -> int:
    """主入口函数"""
    parser = create_parser()
    args = parser.parse_args(argv)
    
    if args.command == "run":
        print(f"运行命令: config={args.config}, account={args.account}")
        # TODO: 实现运行逻辑
        return 0
    elif args.command == "validate-config":
        return validate_config(args.config)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
