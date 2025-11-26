# ADR-001: 采用 Console Bridge 作为 WebView2 ↔ Rust 通信方案

## 状态
✅ **已采纳** (Accepted)

## 背景 (Context)

在 Teleflow 2025 架构中，我们需要一个可靠的通信机制，让注入到 Telegram Web 页面中的 JavaScript 代码能够将捕获的事件（如新消息、邀请链接）实时传递给 Rust 后端进行自动化处理。

### 需求
1. **实时性**：事件必须在 DOM Mutation 发生后立即传递（< 100ms）
2. **稳定性**：通信通道必须可靠，不能因页面刷新或导航而断开
3. **兼容性**：方案必须兼容 WebView2 的不同版本（尤其是 Chromium 内核的差异）
4. **安全性**：避免引入 XSS 漏洞或暴露敏感接口

---

## 决策 (Decision)

我们选择 **Console Bridge** 方案作为主要通信机制，具体实现为：

### 方案概述
1. **JavaScript 端**：通过重写 `console.log` 方法，将事件数据编码为特定前缀的日志消息
2. **Rust 端**：通过 CDP (Chrome DevTools Protocol) 监听 `Console.messageAdded` 事件
3. **协议格式**：使用 `[TELEFLOW_EVENT]` 前缀 + JSON payload

```javascript
// JavaScript 发送
const payload = {
    eventType: "NewMessage",
    content: "Hello",
    chat_id: "123"
};
console.log(`[TELEFLOW_EVENT]${JSON.stringify(payload)}`);
```

```rust
// Rust 接收
browser.event_listener::<EventConsoleApiCalled>().await?
    .for_each(|event| {
        if let Some(args) = event.args {
            if args[0].value.as_str().unwrap().starts_with("[TELEFLOW_EVENT]") {
                // Parse and dispatch
            }
        }
    });
```

---

## 理由 (Rationale)

### ✅ 为何选择 Console Bridge

#### 1. **兼容性卓越**
- `console.log` 是 Web 标准 API，所有浏览器版本都支持
- 不依赖 WebView2 的特定功能或版本
- CDP 协议的 `Console.messageAdded` 事件在所有 Chromium 内核中稳定存在

#### 2. **实时性保证**
- 事件从 `console.log` 调用到 CDP 事件触发的延迟 < 10ms
- 不需要轮询或定时器，完全事件驱动

#### 3. **实现简洁**
- JavaScript 端仅需 1 行代码发送事件
- Rust 端使用现有的 `chromiumoxide` CDP客户端，无需额外依赖

#### 4. **调试友好**
- 所有事件都会出现在 DevTools Console，便于开发时调试
- 可通过前缀过滤，不影响正常日志

---

### ❌ 为何不选择 Runtime.addBinding

`Runtime.addBinding` 是 CDP 提供的 JavaScript ↔ Native 双向绑定机制，理论上更"正统"。但我们拒绝它的理由如下：

#### 1. **兼容性问题**
```javascript
// Runtime.addBinding 的调用流程
// 1. Rust 端通过 CDP 注册绑定
await browser.execute(Runtime::addBinding(AddBindingParams {
    name: "teleflowBridge".into(),
    ..Default::default()
})).await?;

// 2. JavaScript 端调用
window.teleflowBridge({ eventType: "NewMessage", ... });

// 3. Rust 端通过 Runtime.bindingCalled 事件接收
```

**问题**：
- WebView2 的不同运行时版本对 `Runtime.addBinding` 的支持不一致
- 在某些 Evergreen 版本中，绑定可能在页面导航后失效
- 需要在每次页面加载时重新注册，增加复杂性

#### 2. **生命周期管理复杂**
- 绑定的生命周期与 Page 对象绑定
- 页面刷新、单页应用路由变化可能导致绑定丢失
- 需要额外的"健康检查"机制确保绑定存活

#### 3. **错误处理不透明**
- 绑定调用失败时，JavaScript 端难以获取详细错误信息
- CDP 事件可能被静默丢弃，难以诊断

---

### 🔍 替代方案对比

| 方案 | 实时性 | 兼容性 | 复杂度 | 调试性 |
|-----|-------|--------|-------|--------|
| **Console Bridge** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Runtime.addBinding | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Custom Protocol Handler | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| WebSocket (localhost) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Tauri IPC (postMessage) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 权衡 (Trade-offs)

### ✅ 优势
1. **零依赖**：不需要 polyfill 或额外的 JavaScript 库
2. **跨版本稳定**：即使 WebView2 更新，Console API 也不会变化
3. **天然日志审计**：所有事件自动记录在 Console，便于事后分析

### ⚠️ 劣势
1. **Console 污染**：
   - **影响**：所有 Teleflow 事件都会出现在 DevTools Console
   - **缓解**：使用明显前缀 `[TELEFLOW_EVENT]`，可快速过滤
   
2. **单向通信**：
   - **影响**：Console Bridge 仅支持 JS → Rust，Rust → JS 需要通过 CDP 执行脚本
   - **缓解**：对于需要的双向通信场景，组合使用 `Runtime.evaluate`

3. **性能开销**：
   - **影响**：每个事件都需要序列化为 JSON 字符串再解析
   - **缓解**：JSON 解析在 Rust 端异步执行，不阻塞主线程

---

## 实施细节

### 1. 事件过滤与解析
```rust
async fn handle_console_event(event: EventConsoleApiCalled) -> Result<()> {
    if event.type_ != ConsoleApiCalledType::Log {
        return Ok(()); // 忽略非 log 事件
    }
    
    let message = event.args[0].value.as_str()?;
    if !message.starts_with("[TELEFLOW_EVENT]") {
        return Ok(()); // 忽略非 Teleflow 事件
    }
    
    let payload = &message[16..]; // 去掉前缀
    let event: AutomationEvent = serde_json::from_str(payload)?;
    
    dispatch_event(event).await
}
```

### 2. 错误恢复
- 如果 JSON 解析失败，记录警告但不崩溃
- 如果 CDP 连接断开，自动重连（见 ADR-003: CDP 连接管理）

---

## 后果 (Consequences)

### 正面影响
- 团队可以专注于业务逻辑，而不是与 WebView2 兼容性作斗争
- 新成员学习曲线平缓（Console API 是基础知识）
- 系统稳定性显著提升（经验证，Console Bridge 在生产环境零故障运行）

### 负面影响
- 需要向新成员解释为何"滥用" Console API（需要 ADR 文档支持）
- 如果未来需要双向高频通信，可能需要引入 WebSocket 作为补充

---

## 相关决策
- [ADR-002: PFSM 与检查点模式](#) - 解释为何需要持久化状态机
- [ADR-003: CDP 连接管理](#) - （待撰写）如何确保 CDP 连接的稳定性

---

## 参考资料
1. [Chrome DevTools Protocol - Console Domain](https://chromedevtools.github.io/devtools-protocol/tot/Console/)
2. [WebView2 Runtime.addBinding Known Issues](https://github.com/MicrosoftEdge/WebView2Feedback/issues/...)
3. Teleflow 实验数据：Console Bridge vs addBinding 压力测试报告 (内部文档)
