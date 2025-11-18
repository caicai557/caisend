# Telegram 登录状态协议

前端已优化登录状态判断逻辑，后端需要发送明确的状态消息。

## 📋 后端需要发送的消息

### 1. **QR 码就绪** ✅
```
QR code ready
```
或直接发送 Base64 图片：
```
data:image/png;base64,iVBORw0KGgo...
```

**前端行为：**
- 设置 `needsLogin: true`
- 在登录对话框显示 QR 码
- 显示 "⚠️ 未登录" 标签

---

### 2. **登录成功** ✅ （重要！）
```
登录成功
```
或英文版本：
```
Logged in successfully
```

**前端行为：**
- 设置 `needsLogin: false`
- 设置 `online: true`
- **移除** "⚠️ 未登录" 标签
- 显示 "🟢 在线" 标签
- 自动关闭登录对话框
- 显示成功通知

---

### 3. **Session 已加载** ⚠️ （不等于登录成功）
```
Session loaded
```

**前端行为：**
- 仅记录日志
- **不修改** `needsLogin` 状态
- **保持** "⚠️ 未登录" 标签（如果之前是未登录）

**原因：** Session 存在不代表登录成功，可能是过期的 Session。

---

### 4. **未读消息数更新**
```
未读消息: 5
```

**前端行为：**
- 更新 `unreadCount`
- 在卡片显示未读数徽章

---

## 🔄 登录状态流程

### 正常登录流程：

```
1. 用户点击 "🔑 登录" 按钮
   ↓
2. 后端发送: "QR code ready" 或 Base64 图片
   前端显示: ⚠️ 未登录
   ↓
3. 用户扫描 QR 码
   ↓
4. 后端发送: "登录成功" 或 "Logged in successfully"
   前端显示: 🟢 在线
   前端移除: ⚠️ 未登录 标签 ✅
```

### Session 复用流程：

```
1. 启动时检查 Session
   ↓
2. 如果 Session 存在但未验证
   前端显示: ⚠️ 未登录
   ↓
3. 后端验证 Session 有效
   ↓
4. 后端发送: "登录成功"
   前端显示: 🟢 在线
   前端移除: ⚠️ 未登录 标签 ✅
```

---

## ⚠️ 重要规则

### 1. **明确的登录成功消息是必需的**

❌ **错误做法：**
```typescript
// 后端只发送 "Session loaded"
// 前端永远不会移除未登录标签！
```

✅ **正确做法：**
```typescript
// 后端发送明确的登录成功消息
log.info("登录成功")
// 或
log.info("Logged in successfully")
```

### 2. **登录状态的唯一来源**

只有以下消息可以设置 `needsLogin: false`：
- "登录成功"
- "Logged in successfully"

任何其他消息（包括 "Session loaded"）都**不应该**移除未登录标签。

### 3. **状态优先级**

```
未登录 (needsLogin: true) > Session loaded > 启动成功
```

即使账号启动成功，如果没有收到明确的登录成功消息，仍然显示未登录标签。

---

## 🧪 测试场景

### 场景 1: 新账号首次登录
- ✅ 显示 "⚠️ 未登录"
- ✅ 点击登录按钮
- ✅ 扫描 QR 码
- ✅ 收到 "登录成功" 后移除未登录标签
- ✅ 显示 "🟢 在线"

### 场景 2: 有 Session 但未验证
- ✅ 启动时显示 "⚠️ 未登录"
- ✅ 后端加载 Session
- ✅ **保持** "⚠️ 未登录" 标签
- ✅ 验证成功后发送 "登录成功"
- ✅ 移除未登录标签

### 场景 3: Session 过期
- ✅ 启动失败
- ✅ 显示 "⚠️ 未登录"
- ✅ 用户重新登录
- ✅ 收到 "登录成功" 后移除未登录标签

---

## 📝 后端实现建议

```python
# Python 后端示例
class TelegramAccount:
    def login(self):
        # ... 登录逻辑 ...
        if login_successful:
            # 明确发送登录成功消息
            self.log.info("登录成功")  # ✅
            # 或
            self.log.info("Logged in successfully")  # ✅
            
    def load_session(self):
        # ... 加载 Session ...
        self.log.info("Session loaded")  # ⚠️ 不等于登录成功
        
        # 验证 Session 是否有效
        if self.verify_session():
            # 如果验证成功，发送登录成功消息
            self.log.info("登录成功")  # ✅
        else:
            # Session 无效，需要重新登录
            self.log.warning("Session 已过期，需要重新登录")
```

---

## 🎯 总结

**核心原则：**
1. 未登录状态是默认且保守的
2. 只有明确的登录成功消息才能移除未登录标签
3. Session loaded ≠ 登录成功
4. 启动成功 ≠ 登录成功

**后端必须发送：**
- ✅ "登录成功" 或 "Logged in successfully" 当用户真正登录成功时

**后端不应该：**
- ❌ 期望 "Session loaded" 会移除未登录标签
- ❌ 假设启动成功就意味着登录成功
