use enigo::{Enigo, MouseControllable, KeyboardControllable};
use crate::error::CoreError;

/// ActuatorService: 封装Enigo的OS级输入模拟
pub struct ActuatorService {
    enigo: Enigo,
}

impl ActuatorService {
    pub fn new() -> Self {
        Self {
            enigo: Enigo::new(),
        }
    }

    /// 点击屏幕绝对坐标
    pub fn click_at(&mut self, screen_x: i32, screen_y: i32) -> Result<(), CoreError> {
        self.enigo.mouse_move_to(screen_x, screen_y);
        std::thread::sleep(std::time::Duration::from_millis(50)); // 短暂延迟
        self.enigo.mouse_click(enigo::MouseButton::Left);
        Ok(())
    }

    /// 输入文本
    pub fn type_text(&mut self, text: &str) -> Result<(), CoreError> {
        self.enigo.key_sequence(text);
        Ok(())
    }

    /// 坐标映射：视口坐标 -> 屏幕坐标
    /// window_x, window_y: 窗口的屏幕坐标
    /// viewport_x, viewport_y: 元素在视口中的坐标
    /// dpi_scale: DPI缩放因子（可选，默认1.0）
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
}
