import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from src.telegram_multi.automation.auto_responder import AutoResponder, ResponseRule
from src.telegram_multi.message_interceptor import Message, MessageType
from src.telegram_multi.pages.telegram_web import TelegramWebPage

@pytest.mark.asyncio
async def test_auto_reply_logic():
    """Verify that AutoResponder correctly matches and triggers reply with delay."""
    rules = [
        ResponseRule(trigger="hello", response_template="hi {sender_name}", min_delay=2.0, max_delay=4.0)
    ]
    responder = AutoResponder(rules)
    
    msg = Message(
        message_type=MessageType.INCOMING,
        content="hello world",
        sender="Alice",
        timestamp="2025-01-01T00:00:00"
    )
    
    result = responder.auto_reply(msg)
    assert result is not None
    reply, delay = result
    assert reply == "hi Alice"
    assert 2.0 <= delay <= 4.0
    assert len(responder.reply_log) == 1
    assert responder.reply_log[0]["delay"] == delay

@pytest.mark.asyncio
async def test_telegram_web_page_human_typing():
    """Verify TelegramWebPage.type_and_send_human_like calls correct Playwright methods."""
    page_mock = MagicMock()
    page_mock.click = AsyncMock()
    page_mock.locator = MagicMock()
    
    locator_mock = MagicMock()
    locator_mock.press_sequentially = AsyncMock()
    page_mock.locator.return_value = locator_mock
    
    page_mock.keyboard = MagicMock()
    page_mock.keyboard.press = AsyncMock()
    
    tg_page = TelegramWebPage(page_mock)
    
    # Mock random.uniform and asyncio.sleep to speed up test
    with patch("random.uniform", return_value=0.1), \
         patch("random.randint", return_value=10), \
         patch("asyncio.sleep", AsyncMock()) as sleep_mock:
        
        await tg_page.type_and_send_human_like("test message", delay_override=5.0)
        
        # Verify delay_override was used
        sleep_mock.assert_any_call(5.0)
        page_mock.click.assert_called_once()
        locator_mock.press_sequentially.assert_called_once_with("test message", delay=10)
        page_mock.keyboard.press.assert_called_with("Enter")

@pytest.mark.asyncio
async def test_mark_as_read():
    """Verify mark_as_read calls click on MiddleColumn."""
    page_mock = MagicMock()
    page_mock.click = AsyncMock()
    
    tg_page = TelegramWebPage(page_mock)
    await tg_page.mark_as_read()
    
    page_mock.click.assert_called_once_with("#MiddleColumn", timeout=2000)

@pytest.mark.asyncio
async def test_integration_callback_logic():
    """Simulate the callback logic in run_telegram.py with delay and mark_as_read."""
    auto_responder = AutoResponder(rules=[
        ResponseRule(trigger="ping", response_template="pong", min_delay=1.0, max_delay=1.0)
    ])
    
    tg_page_mock = MagicMock(spec=TelegramWebPage)
    tg_page_mock.type_and_send_human_like = AsyncMock()
    tg_page_mock.mark_as_read = AsyncMock()
    
    msg_data = {
        'type': 'incoming',
        'content': 'ping me',
        'sender': 'Bob',
        'timestamp': '2025-01-01T12:00:00'
    }
    
    # Mimic handle_new_message
    msg = Message(
        message_type=MessageType.INCOMING if msg_data['type'] == 'incoming' else MessageType.OUTGOING,
        content=msg_data['content'],
        sender=msg_data['sender'],
        timestamp=msg_data['timestamp']
    )
    
    if msg.message_type == MessageType.INCOMING:
        result = auto_responder.auto_reply(msg)
        if result:
            reply_text, delay = result
            await tg_page_mock.mark_as_read()
            await tg_page_mock.type_and_send_human_like(reply_text, delay_override=delay)
            
    tg_page_mock.mark_as_read.assert_called_once()
    tg_page_mock.type_and_send_human_like.assert_called_once_with("pong", delay_override=1.0)
