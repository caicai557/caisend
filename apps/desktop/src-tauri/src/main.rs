#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tracing_subscriber::{fmt, prelude::*, EnvFilter};

fn main() {
    // Initialize structured logging
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "teleflow=debug,chromiumoxide=info".into()),
        )
        .init();

    // Enable WebView2 CDP on port 9222 (Windows only)
    #[cfg(target_os = "windows")]
    {
        if std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_err() {
            std::env::set_var(
                "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
                "--remote-debugging-port=9222",
            );
            tracing::info!("Enabled WebView2 CDP on port 9222");
        }
    }

    teleflow_desktop_lib::run();
}
