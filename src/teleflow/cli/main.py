"""Teleflow CLI - Telegram Web 助手命令行界面"""

import argparse
import asyncio
import logging
import sys
from typing import Optional
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.config.validator import ConfigValidator
from teleflow.runtime.runner import AccountRunner


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


def setup_logging(debug: bool = False) -> None:
    """设置日志配置"""
    level = logging.DEBUG if debug else logging.INFO
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('teleflow.log', encoding='utf-8')
        ]
    )


def run_teleflow(config_path: str, account_name: Optional[str], show_browser: bool, debug: bool) -> int:
    """运行 Telegram Web 助手
    
    Args:
        config_path: 配置文件路径
        account_name: 指定账号名称
        show_browser: 是否显示浏览器界面
        debug: 是否启用调试模式
        
    Returns:
        int: 0 表示成功，1 表示失败
    """
    try:
        # 设置日志
        setup_logging(debug)
        logger = logging.getLogger("CLI")
        
        # 加载配置
        loader = ConfigLoader()
        config = loader.load_from_file(config_path)
        
        # 选择账号
        if account_name:
            # 查找指定账号
            account = None
            for acc in config.accounts:
                if acc.name == account_name:
                    account = acc
                    break
            
            if not account:
                logger.error(f"未找到账号: {account_name}")
                return 1
        else:
            # 使用默认账号或第一个账号
            if config.default_account:
                account = None
                for acc in config.accounts:
                    if acc.name == config.default_account:
                        account = acc
                        break
                
                if not account:
                    logger.error(f"默认账号 {config.default_account} 不存在")
                    return 1
            else:
                if not config.accounts:
                    logger.error("配置文件中没有账号")
                    return 1
                
                account = config.accounts[0]
                logger.info(f"使用第一个账号: {account.name}")
        
        # 验证账号配置
        if not account.monitor_chats:
            logger.error(f"账号 {account.name} 没有配置监控聊天")
            return 1
        
        if not account.rules:
            logger.warning(f"账号 {account.name} 没有配置回复规则")
        
        # 创建并运行账号运行器
        runner = AccountRunner(
            account=account,
            runtime_config=config.runtime,
            show_browser=show_browser
        )
        
        logger.info(f"开始运行账号: {account.name}")
        logger.info(f"监控聊天: {', '.join(account.monitor_chats)}")
        logger.info(f"规则数量: {len(account.rules)}")
        logger.info(f"检查间隔: {config.runtime.check_interval} 秒")
        logger.info(f"浏览器模式: {'显示' if show_browser else '无头'}")
        
        # 运行主循环
        asyncio.run(runner.run())
        
        return 0
        
    except KeyboardInterrupt:
        print("\n⏹️  用户中断，正在停止...")
        return 0
    except FileNotFoundError:
        print(f"❌ 错误: 配置文件不存在: {config_path}")
        return 1
    except Exception as e:
        print(f"❌ 运行失败: {e}")
        if debug:
            import traceback
            traceback.print_exc()
        return 1


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
        return run_teleflow(
            config_path=args.config,
            account_name=args.account,
            show_browser=args.show_browser,
            debug=args.debug
        )
    elif args.command == "validate-config":
        return validate_config(args.config)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
