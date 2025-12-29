#!/usr/bin/env python3
"""
Multi-Instance Telegram Web A Runner with Bidirectional Translation.

Usage:
    python run_telegram.py --instances 2 --source zh --target en

Requirements:
    pip install playwright
    playwright install chromium
"""

import asyncio
import argparse
import sys
from pathlib import Path
from typing import Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from src.telegram_multi.config import TranslationConfig
from src.telegram_multi.translator import TranslatorFactory, register_builtin_providers
from src.telegram_multi.message_interceptor import MessageInterceptor
from src.telegram_multi.settings import settings

# Register providers
register_builtin_providers()

from src.telegram_multi.pages.telegram_web import TelegramWebPage
from src.telegram_multi.automation.auto_responder import AutoResponder, ResponseRule, Message, MessageType
from src.telegram_multi.automation.contact_manager import ContactManager


async def launch_instance(
    instance_id: str,
    profile_path: str,
    interceptor: MessageInterceptor,
    auto_responder: Optional[AutoResponder] = None,
    contact_manager: Optional[ContactManager] = None,
    headless: bool = False,
):
    """Launch a single Telegram Web A browser instance.

    Args:
        instance_id: Unique identifier for logging
        profile_path: Path to store browser profile data
        interceptor: MessageInterceptor with translation config
        headless: Run in headless mode (default: False for visibility)
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print(
            "ERROR: Playwright not installed. Run: pip install playwright && playwright install chromium"
        )
        return

    async with async_playwright() as p:
        # Launch browser with persistent context (saves login state)
        context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            headless=headless,
            viewport={"width": 1200, "height": 800},
            args=["--disable-blink-features=AutomationControlled"],
        )

        page = await context.new_page()
        tg_page = TelegramWebPage(page)

        # --- Auto-Reply Logic ---
        async def handle_new_message(source, msg_data):
            if not auto_responder:
                return

            # Convert dict to Message object
            try:
                msg = Message(
                    message_type=MessageType.INCOMING if msg_data['type'] == 'incoming' else MessageType.OUTGOING,
                    content=msg_data['content'],
                    sender=msg_data['sender'],
                    timestamp=msg_data['timestamp']
                )
                
                # Only reply to incoming messages
                if msg.message_type == MessageType.INCOMING:
                    result = auto_responder.auto_reply(msg)
                    if result:
                        reply_text, delay = result
                        print(f"[{instance_id}] Auto-replying to '{msg.content}' in {delay:.1f}s: {reply_text}")
                        
                        # 1. Mark as read (optional, but requested)
                        await tg_page.mark_as_read()
                        
                        # 2. Type and send with random delay
                        await tg_page.type_and_send_human_like(reply_text, delay_override=delay)
            except Exception as e:
                print(f"[{instance_id}] Error in auto-reply: {e}")

        await context.expose_binding("onNewMessage", handle_new_message)

    # --- Contact Remark Logic ---
    async def handle_contact_update(source, data):
        if contact_manager:
            contact_manager.update_contact(
                user_id=data['userId'],
                name=data['name'],
                remark=data.get('remark')
            )
            print(f"[{instance_id}] Updated remark for {data['userId']}: {data.get('remark')}")

    async def handle_get_remark(source, user_id):
        if contact_manager:
            contact = contact_manager.get_contact(user_id)
            return contact.remark if contact else None
        return None

    await context.expose_binding("onContactUpdate", handle_contact_update)
    await context.expose_binding("getContactRemark", handle_get_remark)

    # Navigate to Telegram Web A
    print(f"[{instance_id}] Navigating to Telegram Web A...")
    await tg_page.navigate()

    # Inject translation script
    injection_script = interceptor.get_injection_script()
    await tg_page.inject_script(injection_script)

    print(f"[{instance_id}] Instance ready. Press Ctrl+C to close all instances.")

    # Keep browser open until interrupted
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        pass
    finally:
        await context.close()
        print(f"[{instance_id}] Closed.")


async def main(
    num_instances: int, source_lang: str, target_lang: str, profile_base: str
):
    """Main entry point to launch multiple Telegram instances."""

    # Create translation config
    translation_config = TranslationConfig(
        enabled=True,
        provider="google",
        source_lang=source_lang,
        target_lang=target_lang,
    )

    # Create translator
    try:
        translator = TranslatorFactory.create(translation_config)
    except Exception as e:
        print(f"Warning: Could not initialize translator: {e}")
        translator = None

    # Initialize ContactManager
    contact_manager = ContactManager()

    # Create interceptor
    interceptor = MessageInterceptor(config=translation_config, translator=translator)

    # Prepare instance configs
    tasks = []
    for i in range(num_instances):
        instance_id = f"telegram_{i + 1}"
        
        # Create independent AutoResponder per account
        # In a real app, these could be loaded from separate YAML files
        account_rules = [
            ResponseRule(
                trigger="你好", 
                response_template=f"您好！我是账号 {i+1} 的助手。现在时间是 {{time}}。", 
                min_delay=2.0, max_delay=5.0
            ),
            ResponseRule(trigger="在吗", response_template="在的，请讲。", min_delay=1.0, max_delay=3.0),
        ]
        instance_responder = AutoResponder(rules=account_rules)

        profile_path = os.path.join(profile_base, instance_id)
        os.makedirs(profile_path, exist_ok=True)

        task = launch_instance(
            instance_id=instance_id,
            profile_path=profile_path,
            interceptor=interceptor,
            auto_responder=instance_responder,
            contact_manager=contact_manager,
            headless=False,
        )
        tasks.append(task)

    print(f"\n🚀 Launching {num_instances} Telegram instance(s)...")
    print(f"   Translation: {source_lang} ↔ {target_lang}")
    print(f"   Profile Base: {profile_base}\n")

    # Run all instances concurrently
    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\n⏹️ Shutting down all instances...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Launch multiple Telegram Web A instances with translation"
    )
    parser.add_argument(
        "--instances",
        "-n",
        type=int,
        default=2,
        help="Number of browser instances to launch (default: 2)",
    )
    parser.add_argument(
        "--source",
        "-s",
        type=str,
        default="zh",
        help="User's source language code (default: zh)",
    )
    parser.add_argument(
        "--target",
        "-t",
        type=str,
        default="en",
        help="Target/foreign language code (default: en)",
    )
    parser.add_argument(
        "--profile-base",
        "-p",
        type=str,
        default=os.path.expanduser("~/.telegram_profiles"),
        help="Base directory for browser profiles (default: ~/.telegram_profiles)",
    )

    args = parser.parse_args()

    try:
        asyncio.run(
            main(
                num_instances=args.instances,
                source_lang=args.source,
                target_lang=args.target,
                profile_base=args.profile_base,
            )
        )
    except KeyboardInterrupt:
        print("\nBye!")
