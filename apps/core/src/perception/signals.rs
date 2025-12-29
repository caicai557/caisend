//! Perception Signals - Structured data from the browser
//!
//! These are the "senses" of our system - data extracted from Telegram Web.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Source of the perception signal
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SignalSource {
    /// Direct React Fiber read (highest accuracy)
    Fiber,
    /// DOM MutationObserver (fallback)
    Dom,
    /// OCR vision (emergency fallback)
    Ocr,
}

/// Type of perceived event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum PerceptionEvent {
    /// New message received
    MessageReceived {
        chat_id: String,
        sender_id: String,
        sender_name: String,
        content: String,
        timestamp: DateTime<Utc>,
        is_outgoing: bool,
    },
    /// Chat switched (user navigated to different chat)
    ChatChanged {
        chat_id: String,
        chat_title: String,
        peer_type: PeerType,
    },
    /// Typing indicator observed
    TypingIndicator {
        chat_id: String,
        user_id: String,
        is_typing: bool,
    },
    /// Read receipt observed
    ReadReceipt {
        chat_id: String,
        message_ids: Vec<String>,
    },
    /// UI element state change
    UiStateChange {
        element_id: String,
        new_state: String,
    },
}

/// Type of peer in a chat
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PeerType {
    User,
    Group,
    Channel,
    Bot,
}

/// A complete perception signal packet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerceptionSignal {
    /// Unique signal ID
    pub id: String,
    /// Source of the signal
    pub source: SignalSource,
    /// The event payload
    pub event: PerceptionEvent,
    /// When the signal was captured
    pub captured_at: DateTime<Utc>,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f32,
}

impl PerceptionSignal {
    /// Create a new signal from a Fiber source
    pub fn from_fiber(event: PerceptionEvent) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            source: SignalSource::Fiber,
            event,
            captured_at: Utc::now(),
            confidence: 1.0, // Fiber is 100% accurate
        }
    }

    /// Create a new signal from DOM observation
    pub fn from_dom(event: PerceptionEvent, confidence: f32) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            source: SignalSource::Dom,
            event,
            captured_at: Utc::now(),
            confidence: confidence.clamp(0.0, 1.0),
        }
    }
}
