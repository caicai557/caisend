//! Console Bridge - MessagePack communication between JS and Rust
//!
//! Intercepts console.debug messages from the browser containing MessagePack payloads.
//! This is the primary channel for perception data from React Fiber.

use serde::{Deserialize, Serialize};
use tracing::{debug, warn};

use super::signals::{PerceptionEvent, PerceptionSignal};

/// Magic prefix to identify our messages in console.debug
pub const BRIDGE_PREFIX: &str = "__TF_BRIDGE__";

/// Message format sent from JS via console.debug
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeMessage {
    /// Message type identifier
    pub msg_type: BridgeMessageType,
    /// MessagePack payload (base64 encoded when coming from JS)
    pub payload: Vec<u8>,
    /// Timestamp from JS
    pub timestamp: i64,
}

/// Types of messages from the bridge
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BridgeMessageType {
    /// Perception signal (message, chat change, etc.)
    Perception,
    /// Heartbeat to verify bridge is alive
    Heartbeat,
    /// Error from JS side
    Error,
    /// Definition request (JS asking for current definitions)
    DefinitionRequest,
}

/// The Console Bridge handler
pub struct ConsoleBridge {
    /// Counter for received messages
    message_count: u64,
    /// Last heartbeat timestamp
    last_heartbeat: Option<i64>,
}

impl ConsoleBridge {
    /// Create a new Console Bridge
    pub fn new() -> Self {
        Self {
            message_count: 0,
            last_heartbeat: None,
        }
    }

    /// Parse a raw console.debug message
    /// 
    /// Expected format: `__TF_BRIDGE__<base64_msgpack>`
    pub fn parse_message(&mut self, raw: &str) -> Option<BridgeMessage> {
        if !raw.starts_with(BRIDGE_PREFIX) {
            return None;
        }

        let payload_str = &raw[BRIDGE_PREFIX.len()..];
        
        // Decode base64
        let payload_bytes = match base64_decode(payload_str) {
            Ok(bytes) => bytes,
            Err(e) => {
                warn!("Failed to decode base64: {}", e);
                return None;
            }
        };

        // Decode MessagePack
        let message: BridgeMessage = match rmp_serde::from_slice(&payload_bytes) {
            Ok(msg) => msg,
            Err(e) => {
                warn!("Failed to decode MessagePack: {}", e);
                return None;
            }
        };

        self.message_count += 1;
        
        if message.msg_type == BridgeMessageType::Heartbeat {
            self.last_heartbeat = Some(message.timestamp);
            debug!("💓 Heartbeat received");
        }

        Some(message)
    }

    /// Decode a perception event from the payload
    pub fn decode_perception(&self, message: &BridgeMessage) -> Option<PerceptionSignal> {
        if message.msg_type != BridgeMessageType::Perception {
            return None;
        }

        // The payload itself is MessagePack-encoded PerceptionEvent
        let event: PerceptionEvent = match rmp_serde::from_slice(&message.payload) {
            Ok(evt) => evt,
            Err(e) => {
                warn!("Failed to decode perception event: {}", e);
                return None;
            }
        };

        Some(PerceptionSignal::from_fiber(event))
    }

    /// Get total message count
    pub fn message_count(&self) -> u64 {
        self.message_count
    }

    /// Check if bridge is alive (had heartbeat in last N seconds)
    pub fn is_alive(&self, max_age_secs: i64) -> bool {
        match self.last_heartbeat {
            Some(ts) => {
                let now = chrono::Utc::now().timestamp_millis();
                (now - ts) < (max_age_secs * 1000)
            }
            None => false,
        }
    }

    /// Generate the JavaScript injection code
    pub fn generate_injection_script() -> String {
        include_str!("perception.js").to_string()
    }
}

impl Default for ConsoleBridge {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple base64 decode (avoiding additional dependency)
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Standard base64 alphabet
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let input = input.trim_end_matches('=');
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    
    let mut buffer = 0u32;
    let mut bits = 0;
    
    for c in input.chars() {
        let value = ALPHABET.iter().position(|&b| b == c as u8)
            .ok_or_else(|| format!("Invalid base64 character: {}", c))?;
        
        buffer = (buffer << 6) | value as u32;
        bits += 6;
        
        if bits >= 8 {
            bits -= 8;
            output.push((buffer >> bits) as u8);
            buffer &= (1 << bits) - 1;
        }
    }
    
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bridge_message_parse() {
        let mut bridge = ConsoleBridge::new();
        
        // Create a test message
        let msg = BridgeMessage {
            msg_type: BridgeMessageType::Heartbeat,
            payload: vec![],
            timestamp: 1234567890,
        };
        
        // Encode to MessagePack then base64
        let msgpack = rmp_serde::to_vec(&msg).unwrap();
        let b64 = base64_encode(&msgpack);
        let raw = format!("{}{}", BRIDGE_PREFIX, b64);
        
        // Parse
        let parsed = bridge.parse_message(&raw);
        assert!(parsed.is_some());
        
        let parsed = parsed.unwrap();
        assert_eq!(parsed.msg_type, BridgeMessageType::Heartbeat);
        assert_eq!(bridge.message_count(), 1);
    }

    #[test]
    fn test_base64_roundtrip() {
        let original = b"Hello, World!";
        let encoded = base64_encode(original);
        let decoded = base64_decode(&encoded).unwrap();
        assert_eq!(original.to_vec(), decoded);
    }

    fn base64_encode(input: &[u8]) -> String {
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut output = String::new();
        
        for chunk in input.chunks(3) {
            let mut buffer = 0u32;
            for (i, &byte) in chunk.iter().enumerate() {
                buffer |= (byte as u32) << (16 - i * 8);
            }
            
            let chars = match chunk.len() {
                3 => 4,
                2 => 3,
                1 => 2,
                _ => 0,
            };
            
            for i in 0..chars {
                let idx = ((buffer >> (18 - i * 6)) & 0x3F) as usize;
                output.push(ALPHABET[idx] as char);
            }
            
            for _ in chars..4 {
                output.push('=');
            }
        }
        
        output
    }
}
