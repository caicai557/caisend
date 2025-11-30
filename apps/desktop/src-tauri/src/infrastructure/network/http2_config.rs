use serde::{Serialize, Deserialize};

/// HTTP/2 Settings for browser fingerprint matching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Http2Settings {
    /// Initial stream window size (default: 65535 for Chrome)
    pub initial_stream_window_size: u32,
    /// Initial connection window size (typically 6x stream size)
    pub initial_connection_window_size: u32,
    /// Maximum concurrent streams
    pub max_concurrent_streams: u32,
    /// Header table size
    pub header_table_size: u32,
    /// Enable push (usually disabled in browsers)
    pub enable_push: bool,
}

impl Default for Http2Settings {
    fn default() -> Self {
        Self::chrome_126()
    }
}

impl Http2Settings {
    /// Chrome 126+ HTTP/2 settings
    pub fn chrome_126() -> Self {
        Self {
            initial_stream_window_size: 6_291_456, // 6MB (Chrome default)
            initial_connection_window_size: 15_663_105, // ~15MB
            max_concurrent_streams: 100,
            header_table_size: 65536,
            enable_push: false,
        }
    }

    /// Firefox 128+ HTTP/2 settings
    pub fn firefox_128() -> Self {
        Self {
            initial_stream_window_size: 131_072, // 128KB
            initial_connection_window_size: 12_517_377, // ~12MB
            max_concurrent_streams: 100,
            header_table_size: 65536,
            enable_push: false,
        }
    }

    /// Safari 18+ HTTP/2 settings
    pub fn safari_18() -> Self {
        Self {
            initial_stream_window_size: 2_097_152, // 2MB
            initial_connection_window_size: 10_485_760, // 10MB
            max_concurrent_streams: 100,
            header_table_size: 65536,
            enable_push: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_is_chrome() {
        let default = Http2Settings::default();
        let chrome = Http2Settings::chrome_126();
        assert_eq!(default.initial_stream_window_size, chrome.initial_stream_window_size);
    }

    #[test]
    fn test_different_browsers_have_different_settings() {
        let chrome = Http2Settings::chrome_126();
        let firefox = Http2Settings::firefox_128();
        let safari = Http2Settings::safari_18();

        // Verify they're actually different
        assert_ne!(chrome.initial_stream_window_size, firefox.initial_stream_window_size);
        assert_ne!(chrome.initial_stream_window_size, safari.initial_stream_window_size);
    }
}
