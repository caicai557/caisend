use enigo::{Button, Coordinate, Direction, Enigo, Keyboard, Mouse, Settings};
use serde::Deserialize;
use tauri::{Listener, WebviewWindow};
use tokio::{sync::oneshot, time::timeout};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ViewportCoords {
    pub x: f64,
    pub y: f64,
}

/// 从 WebView 查询元素中心点的视口坐标（通过事件回传）
pub async fn request_viewport_coordinates(
    window: &WebviewWindow,
    selector: &str,
) -> Result<Option<ViewportCoords>, String> {
    let event_name = format!("teleflow-coords-{}", Uuid::new_v4());
    let (tx, rx) = oneshot::channel();
    let mut sender = Some(tx);

    // 一次性监听坐标回传
    window.once(event_name.clone(), move |event| {
        if let Some(tx) = sender.take() {
            let payload =
                serde_json::from_str::<Option<ViewportCoords>>(event.payload()).unwrap_or(None);
            let _ = tx.send(payload);
        }
    });

    // 请求前端计算坐标并通过事件返回
    let script = format!(
        "(function() {{
            const el = document.querySelector({selector:?});
            const rect = el ? el.getBoundingClientRect() : null;
            const payload = rect ? {{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }} : null;
            if (window.__TAURI__ && window.__TAURI__.event) {{
                window.__TAURI__.event.emit({event:?}, payload);
            }}
        }})();",
        selector = selector,
        event = event_name
    );

    window
        .eval(&script)
        .map_err(|e| format!("JS eval error: {}", e))?;

    let coords = timeout(std::time::Duration::from_millis(800), rx)
        .await
        .map_err(|_| "Timed out waiting for viewport coordinates".to_string())?
        .map_err(|_| "Coordinate channel closed unexpectedly".to_string())?;

    Ok(coords)
}

/// DPI 感知的屏幕坐标转换
pub async fn get_screen_coordinates(
    window: &WebviewWindow,
    selector: &str,
) -> Result<(i32, i32), String> {
    let viewport = request_viewport_coordinates(window, selector).await?;
    let viewport = viewport.ok_or_else(|| "Element not found".to_string())?;

    let position = window
        .outer_position()
        .map_err(|e| format!("Window position error: {}", e))?;
    let scale = window
        .scale_factor()
        .map_err(|e| format!("Scale factor error: {}", e))?;

    let screen_x = position.x + (viewport.x * scale) as i32;
    let screen_y = position.y + (viewport.y * scale) as i32;
    Ok((screen_x, screen_y))
}

/// 执行 OS 级点击
pub async fn execute_click(x: i32, y: i32) {
    let _ = tokio::task::spawn_blocking(move || {
        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
            let _ = enigo.move_mouse(x, y, Coordinate::Abs);
            std::thread::sleep(std::time::Duration::from_millis(50));
            let _ = enigo.button(Button::Left, Direction::Click);
        }
    })
    .await;
}

/// 执行 OS 级输入
pub async fn execute_typing(text: &str) {
    let text = text.to_string();
    let _ = tokio::task::spawn_blocking(move || {
        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
            let _ = enigo.text(&text);
        }
    })
    .await;
}

/// 坐标映射：视口坐标 -> 屏幕坐标
pub fn map_coordinates(
    window_x: i32,
    window_y: i32,
    viewport_x: f64,
    viewport_y: f64,
    dpi_scale: f64,
) -> (i32, i32) {
    let screen_x = window_x + (viewport_x * dpi_scale) as i32;
    let screen_y = window_y + (viewport_y * dpi_scale) as i32;
    (screen_x, screen_y)
}
