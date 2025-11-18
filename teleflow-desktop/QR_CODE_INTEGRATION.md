# 🔐 QR 码登录集成指南

## 🐛 问题

### 原错误
```
Refused to display 'https://web.telegram.org/' in a frame because it set 'X-Frame-Options' to 'deny'.
```

### 根本原因
Telegram Web 设置了 HTTP 响应头 `X-Frame-Options: deny`，禁止任何网站通过 `<iframe>` 嵌入其页面。这是一个安全措施，防止点击劫持攻击。

### 解决方案
**不能使用 iframe**，必须由**后端生成 QR 码**并传递给前端显示。

---

## ✅ 已完成的修复

### 1. 前端修改

#### `src/components/TelegramLoginDialog.tsx`
```tsx
// ✅ 添加 qrCode 属性
interface TelegramLoginDialogProps {
  show: boolean
  account: string
  qrCode?: string  // ⬅️ Base64 或 URL 格式的 QR 码
  onClose: () => void
  onSuccess?: () => void
}

// ✅ 移除 iframe，改为显示 QR 码
{qrCode ? (
  <div className="text-center">
    <img 
      src={qrCode} 
      alt="Telegram Login QR Code"
      className="w-64 h-64 mx-auto rounded-xl shadow-md"
    />
    <p className="mt-3 text-sm text-gray-500">
      为账号 <strong>{account}</strong> 扫描二维码
    </p>
  </div>
) : (
  <div className="text-center space-y-3">
    <div className="animate-spin ..."></div>
    <p>正在生成二维码...</p>
  </div>
)}
```

#### `src/App.tsx`
```tsx
// ✅ 传递 QR 码给登录对话框
<TelegramLoginDialog
  show={loginDialog.show}
  account={loginDialog.account}
  qrCode={accountStatus[loginDialog.account]?.qrCode || loginDialog.qrCode}
  onClose={...}
  onSuccess={...}
/>
```

---

## 🔧 后端集成要求

### 方案 1: 通过日志推送 QR 码（推荐）

后端在生成 QR 码后，通过日志系统推送 Base64 编码的图片：

```typescript
// 后端示例代码
async function generateQRCode(accountName: string) {
  // 1. 连接 Telegram 获取登录 QR 码
  const qrCodeUrl = await telegramClient.getQRCode()
  
  // 2. 生成 QR 码图片（使用 qrcode 库）
  const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
  
  // 3. 发送日志事件给前端
  mainWindow.webContents.send('log-update', {
    account: accountName,
    message: qrCodeImage,  // ⬅️ Base64: "data:image/png;base64,iVBOR..."
    level: 'info'
  })
}
```

### 方案 2: 通过 IPC 专用通道

创建专门的 IPC 通道传递 QR 码：

```typescript
// electron/main.ts
ipcMain.handle('get-qr-code', async (event, accountName) => {
  const qrCode = await generateQRCode(accountName)
  return { success: true, qrCode }
})

// src/App.tsx
const result = await window.electron.getQRCode(accountName)
if (result.success) {
  setAccountStatus(prev => ({
    ...prev,
    [accountName]: { ...prev[accountName], qrCode: result.qrCode }
  }))
}
```

---

## 📊 数据流程

### 完整登录流程

```
用户点击 [🔑登录]
    ↓
前端: handleStart()
    ↓
调用: window.electron.startAccount(accountName)
    ↓
后端: 启动 Telegram 客户端
    ↓
后端: 生成 QR 码 (data:image/png;base64,...)
    ↓
后端: 发送日志事件 { message: qrCodeBase64 }
    ↓
前端: onLogUpdate() 接收
    ↓
前端: 更新 accountStatus[account].qrCode
    ↓
前端: TelegramLoginDialog 显示 <img src={qrCode} />
    ↓
用户扫描 QR 码
    ↓
后端: 接收登录成功事件
    ↓
后端: 发送日志 { message: "登录成功" }
    ↓
前端: 关闭对话框，更新状态
```

---

## 🎨 QR 码格式

### Base64 格式（推荐）
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

**优点:**
- ✅ 不需要额外的文件系统
- ✅ 直接在 `<img src>` 中使用
- ✅ 数据自包含

### 文件 URL 格式
```
file:///C:/temp/qrcode.png
```

**优点:**
- ✅ 适合大型二维码
- ✅ 可以复用

---

## 🧪 测试清单

### 1. 后端 QR 码生成测试
```bash
# 检查后端是否安装 QR 码库
npm install qrcode
# 或
pip install qrcode pillow
```

### 2. 前端接收测试

打开浏览器控制台，点击登录，检查：

```javascript
// 应该看到日志：
[handleStart] { accountName: "test", needsLogin: true }
[handleStart] 打开登录对话框

// 然后在 onLogUpdate 中应该收到：
{
  account: "test",
  message: "data:image/png;base64,iVBORw0KGgoAAAA..."
}
```

### 3. UI 显示测试

- [ ] 点击登录按钮
- [ ] 对话框打开并显示"正在生成二维码..."
- [ ] 2-3秒后显示 QR 码图片
- [ ] QR 码清晰可扫描（256x256 像素）
- [ ] 显示账号名称提示

---

## 🔍 调试技巧

### 1. 检查 QR 码是否到达前端

```tsx
// 在 App.tsx 的 onLogUpdate 中添加：
console.log('[QR Code] 收到消息:', log.message.substring(0, 50))
if (log.message.startsWith('data:image')) {
  console.log('[QR Code] QR 码已接收，长度:', log.message.length)
}
```

### 2. 手动测试 QR 码显示

在浏览器控制台运行：
```javascript
// 设置测试 QR 码
accountStatus['test'].qrCode = 'data:image/png;base64,iVBORw0KG...'
```

### 3. 检查后端日志

后端应该输出：
```
[INFO] 正在生成 QR 码 for account: test
[INFO] QR 码已生成，大小: 1234 bytes
[INFO] 已发送 QR 码到前端
```

---

## 🚨 常见问题

### Q1: QR 码不显示，一直显示"正在生成..."

**原因:**
- 后端没有发送 QR 码数据
- 日志事件格式不匹配
- QR 码数据损坏

**解决:**
```typescript
// 检查 onLogUpdate 条件
if (log.message.includes('QR code ready') || log.message.startsWith('data:image')) {
  const qrCode = log.message.startsWith('data:image') ? log.message : undefined
  // ...
}
```

### Q2: QR 码显示但无法扫描

**原因:**
- QR 码分辨率太低
- 编码错误
- Telegram URL 格式不正确

**解决:**
```typescript
// 确保 QR 码至少 256x256
QRCode.toDataURL(url, {
  width: 256,      // ⬅️ 最小 256
  margin: 2,
  errorCorrectionLevel: 'H'  // ⬅️ 高容错
})
```

### Q3: Base64 字符串太长

**解决方案:**
- 使用 PNG 而非 BMP（更小）
- 启用压缩
- 或使用文件 URL

---

## 📝 后端实现示例

### Node.js (Electron)

```javascript
import QRCode from 'qrcode'
import { ipcMain, BrowserWindow } from 'electron'

async function handleTelegramLogin(accountName) {
  // 1. 获取 Telegram 登录 URL
  const loginUrl = await telegramClient.requestQRCodeUrl()
  
  // 2. 生成 QR 码图片
  const qrCodeDataUrl = await QRCode.toDataURL(loginUrl, {
    width: 256,
    margin: 2,
    color: { dark: '#000', light: '#fff' }
  })
  
  // 3. 发送到前端
  const mainWindow = BrowserWindow.getAllWindows()[0]
  mainWindow.webContents.send('log-update', {
    account: accountName,
    message: qrCodeDataUrl,
    level: 'info',
    timestamp: Date.now()
  })
  
  console.log(`[QR] 已为账号 ${accountName} 生成 QR 码`)
}
```

### Python

```python
import qrcode
import base64
from io import BytesIO

def generate_qr_code(url):
    # 创建 QR 码
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # 生成图片
    img = qr.make_image(fill_color="black", back_color="white")
    
    # 转为 Base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_base64}"
```

---

## 🎯 下一步

### 必须实现
- [ ] 后端生成 QR 码功能
- [ ] 通过日志推送 QR 码
- [ ] 处理 QR 码过期（120秒）
- [ ] 登录成功后清除 QR 码

### 可选优化
- [ ] QR 码刷新按钮
- [ ] 倒计时显示
- [ ] 错误重试机制
- [ ] 支持多账号同时登录

---

## 📚 参考资源

- [QRCode.js](https://github.com/soldair/node-qrcode) - Node.js QR 码库
- [qrcode (Python)](https://github.com/lincolnloop/python-qrcode) - Python QR 码库
- [Telegram Bot API](https://core.telegram.org/bots/api) - Telegram API 文档
- [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) - MDN 文档

---

*创建时间: 2025-01-16*
*状态: ✅ 前端已完成，等待后端实现*
