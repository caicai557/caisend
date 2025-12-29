import json
import os
from typing import Dict, Optional
from pydantic import BaseModel

class ContactInfo(BaseModel):
    user_id: str
    original_name: str
    remark: Optional[str] = None

class ContactManager:
    """Manages shared contact remarks across multiple instances."""

    def __init__(self, storage_path: str = "data/contacts.json"):
        self.storage_path = storage_path
        self._ensure_storage()
        self.contacts: Dict[str, ContactInfo] = self._load_contacts()

    def _ensure_storage(self):
        """Ensure the storage directory and file exist."""
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _load_contacts(self) -> Dict[str, ContactInfo]:
        """Load contacts from JSON file."""
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {k: ContactInfo(**v) for k, v in data.items()}
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _save_contacts(self):
        """Save contacts to JSON file."""
        data = {k: v.model_dump() for k, v in self.contacts.items()}
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_contact(self, user_id: str) -> Optional[ContactInfo]:
        """Get contact info by user ID."""
        # Reload to ensure sync across instances
        self.contacts = self._load_contacts()
        return self.contacts.get(user_id)

    def update_contact(self, user_id: str, name: str, remark: Optional[str] = None):
        """Update or create contact info."""
        # Reload first to avoid overwriting other instances' changes
        self.contacts = self._load_contacts()
        
        if user_id in self.contacts:
            self.contacts[user_id].original_name = name
            if remark is not None:
                self.contacts[user_id].remark = remark
        else:
            self.contacts[user_id] = ContactInfo(
                user_id=user_id,
                original_name=name,
                remark=remark
            )
        
        self._save_contacts()
        return self.contacts[user_id]
