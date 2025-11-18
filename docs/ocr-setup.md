# OCR 功能设置指南

## 📋 概述

Teleflow v1.2+ 支持可选的 OCR (光学字符识别) 功能，可以从图片中提取数字并在自动回复中使用。

⚠️ **注意**: OCR 功能是**可选的**，不影响核心功能使用。

## 🔧 安装步骤

### 1. 安装 Python 依赖

```bash
pip install "teleflow[ocr]"
# 或者
pip install pytesseract Pillow
```

### 2. 安装 Tesseract OCR 引擎

#### Windows
1. 下载 Tesseract 安装包: https://github.com/UB-Mannheim/tesseract/wiki
2. 运行安装程序，记住安装路径（例如: `C:\Program Files\Tesseract-OCR\tesseract.exe`）
3. 添加到系统 PATH 或在代码中指定路径

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

### 3. 验证安装

```bash
tesseract --version
```

应该看到类似输出:
```
tesseract 5.3.0
```

## 📖 使用方法

### 基本用法

```python
from teleflow.ocr import DigitRecognizer, ImagePreprocessor

# 1. 创建识别器
recognizer = DigitRecognizer()

# 2. 识别图片中的数字
result = recognizer.recognize("path/to/image.png")

if result.success:
    print(f"识别结果: {result.text}")
    print(f"仅数字: {result.digits_only}")
else:
    print(f"识别失败: {result.error_message}")
```

### 图片预处理

如果图片质量不佳，可以先预处理：

```python
# 1. 预处理图片
preprocessor = ImagePreprocessor()
processed_path = preprocessor.preprocess(
    "input.png",
    grayscale=True,      # 灰度化
    binarize=True,       # 二值化
    threshold=128,       # 二值化阈值
    enhance_contrast=True,  # 增强对比度
    denoise=False        # 去噪（可选）
)

# 2. 识别预处理后的图片
result = recognizer.recognize(processed_path)
```

### 在配置文件中使用

```yaml
accounts:
  - name: my-account
    monitor_chats:
      - "Customer Support"
    rules:
      - keywords:
          - "验证码"
          - "code"
        reply_text: "您的验证码是: {ocr_result}"
        fixed_delay: 2
        random_delay_max: 3
```

当系统检测到图片消息且规则匹配时，会自动：
1. 下载图片
2. 进行 OCR 识别
3. 将结果替换 `{ocr_result}` 变量
4. 发送回复

## 🎯 配置选项

### DigitRecognizer 参数

```python
recognizer = DigitRecognizer(
    tesseract_cmd="C:/Program Files/Tesseract-OCR/tesseract.exe",  # Windows 路径
    digits_only=True,      # 仅识别数字
    psm_mode=7            # Page Segmentation Mode
)
```

#### PSM 模式说明

- `6`: 假设有一个单独的文本块
- `7`: **单行文本（推荐用于数字）**
- `8`: 单个单词
- `13`: 原始行

### ImagePreprocessor 参数

```python
preprocessor = ImagePreprocessor()

result = preprocessor.preprocess(
    image_path="input.png",
    output_path="output.png",  # 可选
    grayscale=True,            # 转为灰度
    binarize=True,             # 二值化
    threshold=128,             # 阈值 (0-255)
    enhance_contrast=True,     # 增强对比度
    denoise=False              # 去噪
)
```

## 🐛 常见问题

### 1. `TesseractNotFoundError`

**问题**: pytesseract 找不到 Tesseract

**解决方案**:
```python
# 方法1: 显式指定路径
from teleflow.ocr import DigitRecognizer

recognizer = DigitRecognizer(
    tesseract_cmd=r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# 方法2: 添加到系统 PATH
# Windows: 系统设置 > 环境变量 > 添加 Tesseract 路径
```

### 2. 识别准确率低

**解决方案**:
1. 使用图片预处理
2. 调整二值化阈值
3. 使用更高质量的图片
4. 调整 PSM 模式

```python
# 示例: 自动预处理
result = recognizer.recognize(
    "image.png",
    preprocess=True  # 自动预处理
)
```

### 3. 识别结果包含非数字字符

**解决方案**:
```python
# OCRResult 提供了 digits_only 属性
result = recognizer.recognize("image.png")
clean_digits = result.digits_only  # 仅保留数字
```

## 📊 性能优化

### 批量处理

```python
image_paths = ["img1.png", "img2.png", "img3.png"]

results = recognizer.recognize_batch(
    image_paths,
    preprocess=True  # 批量预处理
)

for i, result in enumerate(results):
    print(f"图片 {i+1}: {result.text}")
```

### 缓存预处理结果

预处理后的图片会自动保存，可以重复使用：

```python
# 第一次: 预处理并保存
preprocessor = ImagePreprocessor()
processed = preprocessor.preprocess("input.png", output_path="processed.png")

# 后续: 直接使用预处理后的图片
result = recognizer.recognize("processed.png")
```

## 🔗 相关资源

- [Tesseract OCR 官方文档](https://tesseract-ocr.github.io/)
- [pytesseract GitHub](https://github.com/madmaze/pytesseract)
- [Pillow 文档](https://pillow.readthedocs.io/)
- [PSM 模式详解](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html#page-segmentation-method)

## 🚀 示例应用场景

### 1. 自动回复验证码

```yaml
rules:
  - keywords: ["验证码", "code"]
    reply_text: "您的验证码是: {ocr_result}"
```

### 2. 提取账单金额

```python
result = recognizer.recognize("receipt.png")
amount = result.digits_only
print(f"金额: {amount}")
```

### 3. 识别数字截图

```python
# 游戏分数、统计数据等
result = recognizer.recognize("score.png", preprocess=True)
print(f"分数: {result.text}")
```
