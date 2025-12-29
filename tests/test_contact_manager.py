import pytest
import os
import json
from src.telegram_multi.automation.contact_manager import ContactManager, ContactInfo

def test_contact_manager_storage(tmp_path):
    storage_file = tmp_path / "contacts.json"
    manager = ContactManager(storage_path=str(storage_file))
    
    # Test update
    manager.update_contact("user123", "Alice", "Friend")
    
    # Verify file content
    with open(storage_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert "user123" in data
        assert data["user123"]["original_name"] == "Alice"
        assert data["user123"]["remark"] == "Friend"

def test_contact_manager_get_and_update(tmp_path):
    storage_file = tmp_path / "contacts.json"
    manager1 = ContactManager(storage_path=str(storage_file))
    manager2 = ContactManager(storage_path=str(storage_file))
    
    # Manager 1 updates
    manager1.update_contact("user456", "Bob", "Colleague")
    
    # Manager 2 should see it (it reloads on get)
    contact = manager2.get_contact("user456")
    assert contact is not None
    assert contact.remark == "Colleague"
    
    # Manager 2 updates remark
    manager2.update_contact("user456", "Bob", "Best Friend")
    
    # Manager 1 should see update
    contact = manager1.get_contact("user456")
    assert contact.remark == "Best Friend"

def test_contact_manager_auto_record(tmp_path):
    storage_file = tmp_path / "contacts.json"
    manager = ContactManager(storage_path=str(storage_file))
    
    # Update without remark (auto-record)
    manager.update_contact("user789", "Charlie")
    
    contact = manager.get_contact("user789")
    assert contact.original_name == "Charlie"
    assert contact.remark is None
