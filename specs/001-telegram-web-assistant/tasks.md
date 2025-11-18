# 任务清单：Telegram Web 助手

**功能分支**: `001-telegram-web-assistant`  
**创建日期**: 2025-01-16  
**基于文档**: spec.md, plan.md, constitution.md

---

## 实施策略

### MVP 优先原则

**MVP 定义**: 阶段 1-4（共 38 个任务），确保核心功能端到端可用

- **核心路径**: 单账号 + 单聊天 + 单节点关键词自动回复 + 延时 + 自动已读
- **验证目标**: 用户能够配置一个账号，监控一个聊天，收到包含关键词的消息后在延时后自动回复
- **后续扩展**: 在 MVP 稳定后，逐步添加多账号、群组、OCR、桌面 UI 等功能
- **严格纪律**: 禁止提前实现 v1.1+ 功能，避免过度设计

### 任务统计

- **MVP 任务数**: 38 个任务（阶段 1-4）
- **扩展任务数**: 62 个任务（阶段 5-9）
- **预计 MVP 时间**: 10-12 小时
- **预计总时间**: 30-35 小时
- **并行机会**: 标记 [P] 的任务可并行执行
- **用户故事映射**:
  - US1 (P1): 自动已读与关键词回复（单节点）- MVP 核心
  - US2 (P2): 多账号支持 - v1.1 扩展
  - US3 (P2): 群组支持 - v1.1 扩展
  - US4 (P3): OCR 识别 - v1.2 可选增强，非 MVP
  - US0 (P2/P3): 桌面端 UI - v1.2+（P2: 基础监控，P3: 完整管理）

---

## 阶段 1：项目初始化与基础结构

**目标**: 搭建项目骨架，配置开发环境，建立模块化目录结构

**完成标准**:

- 项目结构按照 plan.md 定义创建完成
- 可成功安装依赖并运行 `python -m teleflow --version`
- 代码格式化和类型检查工具配置完成

### Phase 3 任务清单

- [X] T001 创建项目根目录结构 src/teleflow/, tests/, docs/
- [X] T002 创建 pyproject.toml 配置项目元数据和核心依赖（MVP）
- [X] T003 [P] 创建 MVP 模块目录 config/, models/, engine/, telegram_web/, runtime/, cli/, logging/
- [X] T004 [P] 配置 mypy.ini、.gitignore、README.md
- [X] T005 创建 src/teleflow/cli/main.py 实现 --version 命令
- [X] T006 测试：pip install -e . && python -m teleflow --version

**预计时间**: 1-2 小时

**MVP 里程碑**: ✅ 项目骨架完成

---

## 阶段 2：配置与数据模型

**目标**: 实现 YAML 配置解析和 Pydantic 数据模型

**完成标准**:

- 可加载并解析 YAML 配置
- 配置错误时输出详细错误信息
- 通过单元测试验证配置加载逻辑

### Phase 3 任务清单 (配置系统)

- [X] T007 [P] [US1] 定义所有 Pydantic 数据模型（合并任务）
  - 创建 models/account.py, chat.py, rule.py, message.py
  - 创建 config/schema.py 定义 TeleflowConfig 根模型
  - 使用通用字段命名（id, condition, action）保持扩展性
  - 保留可选字段（next_id）但当前不使用
- [X] T008 [P] [US1] 创建 tests/unit/test_models.py 测试数据模型验证逻辑
- [X] T009 [US1] 创建 config/loader.py 实现 load_config() 函数
- [X] T010 [US1] 在 loader.py 中实现配置校验和错误处理（ValidationError 捕获）
- [X] T011 [P] 创建 tests/fixtures/config_samples/valid_config.yaml（MVP 最小配置）
- [X] T012 [P] [US1] 创建 tests/unit/test_config.py 测试配置加载和错误处理
- [X] T013 [US1] 在 cli/main.py 中添加 validate-config 命令
- [X] T014 测试：teleflow validate-config --config valid_config.yaml

**预计时间**: 1.5-2 小时

**MVP 里程碑**: ✅ 配置系统完成

---

## 阶段 3：关键词规则与延时逻辑

**目标**: 实现规则匹配引擎和延时计算器

**完成标准**:

- 规则匹配支持通配符（*、?）和大小写控制
- 延时计算器按"固定 + 随机"公式计算
- 单元测试覆盖率 >= 90%

### Phase 3 任务清单（规则引擎）

- [X] T015 [P] [US1] 实现 RuleMatcher（匹配与调度）（合并任务）
  - 创建 engine/matcher.py 定义 RuleMatcher 类
  - 实现 match() 方法：接收消息文本，返回第一个匹配的规则
  - 实现 _matches_rule(): 使用 fnmatch 实现通配符匹配（*、?）
  - 实现 case_sensitive 参数支持
  - 仅实现单节点决策逻辑（不实现节点跳转、状态机等）
- [X] T016 [P] [US1] 创建 tests/unit/test_matcher.py 测试规则匹配逻辑
  - 测试字面量匹配
  - 测试通配符匹配
  - 测试大小写敏感/不敏感
  - 测试多规则优先级
- [X] T017 [US1] 创建 engine/delay.py 定义 DelayCalculator 类
- [X] T018 [US1] 实现 calculate_delay(): 固定延时 + random.uniform(0, 随机上限)
- [X] T019 [P] [US1] 创建 tests/unit/test_delay.py 测试延时计算逻辑
- [X] T020 测试：pytest tests/unit/ -v --cov=teleflow.rules（覆盖率 >= 90%）

**预计时间**: 2-2.5 小时

**MVP 里程碑**: ✅ 规则引擎完成

---

## 阶段 4：Telegram Web 集成（单账号单聊天）

**目标**: 实现 Playwright 浏览器管理、消息监控、已读标记、消息发送

**完成标准**:

- 可启动 Playwright 浏览器并加载 Telegram Web
- 支持 headless 模式和会话持久化
- 可定位聊天、检测未读、标记已读、发送消息
- 端到端测试：配置单账号和聊天，验证自动回复

### Phase 4 任务清单（Telegram Web 集成）

- [X] T021 [US1] 创建 telegram_web/browser.py 定义 BrowserManager 类
- [X] T022 [US1] 实现 launch(): 启动 Playwright Chromium，支持 user_data_dir 和 headless
- [X] T023 [US1] 实现 close(): 优雅关闭浏览器和 Playwright
- [X] T024 [US1] 创建 telegram_web/selectors.py 定义选择器常量（支持回退机制）
- [X] T025 [US1] 创建 telegram_web/navigator.py 实现 navigate_to_chat()
  - 实现搜索聊天功能
  - 实现重试逻辑（最多 3 次，间隔 5 秒）
  - 实现登录状态检测
- [X] T026 [P] [US1] 创建 tests/unit/test_navigator.py 测试导航逻辑（模拟 Playwright）
- [X] T027 [US1] 创建 telegram_web/monitor.py 实现 check_new_messages()
- [X] T028 [US1] 实现 get_latest_message_text()（包含 Playwright 超时处理）
- [X] T029 [US1] 创建 telegram_web/actions.py 实现 mark_as_read()
- [X] T030 [US1] 实现 send_message()（包含选择器回退和重试）
- [X] T031a [US1] 创建 runtime/runner.py 定义 AccountRunner 类基架
  - 初始化 BrowserManager、ChatNavigator、MessageMonitor、MessageActions
  - 定义 run() 方法框架
- [X] T031b [US1] 实现消息监控主循环
  - 定时轮询 2-3 秒
  - 检测新消息 → 自动标记已读
  - 实现网络错误降级模式（连续 5 次失败 → 10 秒轮询）
- [X] T031c [US1] 整合规则匹配与延时逻辑
  - 调用 RuleMatcher.match() 匹配规则
  - 调用 DelayCalculator.calculate_delay() 计算延时
  - 等待延时后调用 send_message() 发送回复
- [X] T032 [US1] 在 cli/main.py 中添加 run 命令
  - 参数：--config（必填）、--show-browser（可选）
  - 加载配置 → 启动 AccountRunner
- [X] T033 [P] [US1] 创建 tests/integration/test_single_account.py 测试单账号端到端流程
- [X] T034 [US1] 手动测试：首次登录保存会话
  - teleflow run --config test_config.yaml --show-browser
  - 手动输入手机号和验证码完成登录
  - 验证会话保存到 browser_data/
- [X] T035 [US1] 手动测试：后台模式自动回复
  - teleflow run --config test_config.yaml
  - 发送包含关键词的消息
  - 验证在延时后收到自动回复
- [X] T036 [US1] 手动测试：自动已读功能
  - 发送多条消息
  - 验证所有消息自动标记为已读
- [X] T037 [US1] 手动测试：异常处理
  - 测试网络错误降级模式
  - 测试登录失效检测
  - 测试选择器回退机制
- [X] T038 [US1] MVP 验收测试：连续运行 1 小时
  - 验证无崩溃、无内存泄漏
  - 验证日志正常输出
  - 验证所有核心功能正常工作

**预计时间**: 4-5 小时

**MVP 里程碑**: 🎯 **MVP 完成！** 核心功能端到端可用

---

## 阶段 5：多账号支持与后台运行（v1.1 扩展）

**目标**: 扩展系统支持多账号，实现一账号一进程模式

**完成标准**:

- 支持配置文件中定义多个账号
- 各账号进程互不干扰，状态完全隔离
- 支持信号处理（SIGINT/SIGTERM）优雅退出

### Phase 5 任务清单（多账号支持）

- [X] T039 [US2] 扩展 Config 模型支持 accounts 列表（保持向后兼容）
- [X] T040 [US2] 实现 get_account() 方法根据账号名称获取配置
- [X] T041 [P] [US2] 创建 tests/unit/test_multi_account_config.py 测试多账号配置
- [X] T042 [US2] 更新 run 命令参数：--account 可选（默认使用第一个账号）
- [X] T043 [US2] 实现默认 user_data_dir 生成：./browser_data/{account_name}/
- [X] T044 [US2] 添加账号名称日志前缀便于区分（格式：[{account_name}] message）
- [X] T045 [P] [US2] 创建 runtime/signals.py 实现 SIGINT/SIGTERM 处理
- [X] T046 [US2] 在 AccountRunner 中集成信号处理，收到信号后优雅退出
- [ ] T047 [P] [US2] 创建 tests/integration/test_multi_account.py 测试多账号隔离
- [ ] T048 [US2] 手动测试：创建两个账号配置，同时启动两个进程
- [ ] T049 [US2] 手动测试：验证各账号使用独立的浏览器数据目录
- [ ] T050 [US2] 手动测试：按 Ctrl+C 验证优雅退出并关闭所有浏览器

**预计时间**: 2-2.5 小时

**扩展里程碑**: ✅ 多账号支持完成（v1.1）

---

## 阶段 6：群组邀请链接与入群欢迎（v1.1 扩展）

**目标**: 实现群组自动加入和欢迎消息功能

**完成标准**:

- 可通过邀请链接自动加入群组
- 网络错误时重试 3 次
- 加入成功后等待 3-5 秒发送欢迎消息
- 群组消息参与自动已读和关键词回复

### Phase 6 任务清单（群组支持）

- [X] T051 [US3] 在 models/account.py 中添加 groups 字段
- [X] T052 [US3] 创建 models/group.py 定义 GroupInvite 模型
- [ ] T053 [P] [US3] 创建 tests/unit/test_group_model.py 测试群组模型
- [X] T054 [US3] 创建 telegram_web/groups.py 实现 join_group()
- [X] T055 [US3] 实现已加入检测和网络错误重试（3 次，间隔 5 秒）
- [X] T056 [US3] 实现等待页面稳定（3-5 秒）并发送欢迎消息
- [ ] T057 [P] [US3] 创建 tests/unit/test_groups.py 测试群组加入逻辑
- [X] T058 [US3] 在 AccountRunner 中添加启动时群组加入流程
- [X] T059 [US3] 扩展监控逻辑支持群组消息（多聊天监控）
- [ ] T060 [P] [US3] 创建 tests/integration/test_group_join.py 测试群组集成
- [ ] T061 [US3] 手动测试：配置群组邀请链接，验证自动加入并发送欢迎消息
- [ ] T062 [US3] 手动测试：在群组中发送关键词消息，验证自动回复

**预计时间**: 2-2.5 小时

**扩展里程碑**: ✅ 群组支持完成（v1.1）

---

## 阶段 7：截图数字识别 OCR（v1.2 可选增强，非 MVP）

**目标**: 实现 Tesseract OCR 封装，支持从图片中提取数字

**⚠️ 注意**: 此功能为**可选增强**，不属于 MVP 范围，建议在 v1.2 或更晚版本实现

**完成标准**:

- 可对图片进行预处理（灰度化、二值化）
- 可调用 Tesseract 识别数字
- OCR 结果可在回复中引用（{ocr_result}）
- 单元测试覆盖率 >= 80%

### Phase 7 任务清单（OCR 支持）

- [X] T063 [US4] 创建 ocr/ 模块目录
- [X] T064 [US4] 创建 ocr/types.py 定义 OCRResult 数据类
- [X] T065 [US4] 创建 ocr/preprocessor.py 实现 preprocess(): 灰度化 + 二值化
- [ ] T066 [P] [US4] 创建 tests/unit/test_preprocessor.py 测试图片预处理
- [X] T067 [US4] 创建 ocr/recognizer.py 定义 DigitRecognizer 类
- [X] T068 [US4] 实现 recognize(): 调用 pytesseract.image_to_string
- [X] T069 [US4] 配置 Tesseract 为数字识别模式（--psm 7 digits）
- [X] T070 [US4] 实现结果清理：仅保留 0-9 数字
- [ ] T071 [P] [US4] 创建 tests/fixtures/images/ 添加测试图片
- [ ] T072 [P] [US4] 创建 tests/unit/test_recognizer.py 测试 OCR 识别
- [X] T073 [US4] 在 AccountRunner 中集成 OCR 逻辑：检测图片时触发 OCR
- [X] T074 [US4] 在 send_message() 中实现模板变量替换：{ocr_result}
- [ ] T075 [P] [US4] 创建 tests/integration/test_ocr.py 测试 OCR 端到端流程
- [ ] T076 [US4] 手动测试：发送数字截图，验证 OCR 识别并在回复中引用

**预计时间**: 2-2.5 小时

**扩展里程碑**: ✅ OCR 支持完成（v1.2 可选）

---

## 阶段 8a：桌面端基础 UI（P2 只读监控，v1.2 扩展）

**目标**: 实现简单的桌面端 UI，提供账号状态监控和日志查看（只读）

**完成标准**:

- UI 仅展示账号运行状态和日志，不支持配置编辑
- 可查看各账号的运行状态（运行中/已停止）
- 可实时查看日志输出
- 不涉及进程管理和配置编辑

### Phase 8a 任务清单（基础监控 UI）

- [ ] T077 [US0-P2] 创建 ui/ 目录并初始化 Electron + React 项目
- [ ] T078 [US0-P2] 配置 package.json: electron, react, electron-builder
- [ ] T079 [US0-P2] 创建 ui/src/main.js 定义 Electron 主进程入口
- [ ] T080 [US0-P2] 创建 ui/src/App.jsx 主窗口布局
- [ ] T081 [US0-P2] 创建 components/AccountList.jsx 实现账号状态只读展示
- [ ] T082 [US0-P2] 创建 components/LogViewer.jsx 实现日志实时查看
- [ ] T083 [US0-P2] 创建 services/ConfigReader.js 读取配置文件（只读）
- [ ] T084 [US0-P2] 创建 services/LogReader.js 实现日志文件监听
- [ ] T085a [US0-P2] 创建 services/ProcessDetector.js 实现进程状态检测（只读）
  - 检测进程是否运行（通过 PID 文件或进程列表）
  - 定期轮询进程状态
- [ ] T086 [US0-P2] 手动测试：启动 UI，验证账号状态和日志实时更新

**预计时间**: 3-4 小时

**扩展里程碑**: ✅ 基础监控 UI 完成（v1.2 P2）

---

## 阶段 8b：桌面端高级 UI（P3 配置编辑 + 进程管理，v1.3+ 扩展）

**目标**: 扩展桌面端 UI，支持配置编辑和进程管理

**完成标准**:

- 支持通过 UI 新增/编辑/删除账号配置
- 支持通过 UI 启动/停止账号进程
- 支持编辑关键词规则和群组邀请链接
- 支持配置保存和验证

### Phase 8b 任务清单（高级管理 UI）

- [ ] T087 [US0-P3] 创建 components/ConfigEditor.jsx 实现账号配置编辑
- [ ] T088 [US0-P3] 创建 components/RuleEditor.jsx 实现关键词规则表单
- [ ] T089 [US0-P3] 创建 components/GroupEditor.jsx 实现群组邀请链接编辑
- [ ] T090 [US0-P3] 创建 services/ConfigWriter.js 实现配置保存和验证
- [ ] T085b [US0-P3] 扩展 ProcessDetector 为 ProcessManager（管理功能）
  - 实现 startAccount(): 启动账号子进程
  - 实现 stopAccount(): 停止账号子进程
  - 实现进程 PID 管理和状态跟踪
- [ ] T085c [US0-P3] 在 AccountList 中集成启动/停止按钮
- [ ] T091 [US0-P3] 实现新增/编辑/删除账号对话框
- [ ] T092 [US0-P3] 手动测试：通过 UI 创建账号、配置规则、启动账号
- [ ] T093 [US0-P3] 手动测试：通过 UI 停止账号，验证进程正常关闭
- [ ] T094 [US0-P3] 手动测试：编辑规则并保存，验证配置文件更新

**预计时间**: 5-6 小时

**扩展里程碑**: ✅ 完整管理 UI 完成（v1.3+ P3）

---

## 阶段 9：日志系统、测试与文档

**目标**: 完善日志系统，补充集成测试和性能测试，编写文档

**完成标准**:

- 日志同时输出到控制台和文件
- 日志按天轮转，保留 30 天历史
- 补充集成测试和性能测试
- 编写用户文档和开发者文档

### Phase 9 任务清单（日志系统）

- [ ] T095 [P] 创建 logging/setup.py 配置 Python logging
- [ ] T096 [P] 实现 TimedRotatingFileHandler 按天轮转，保留 30 天
- [ ] T097 [P] 实现双输出（控制台 + 文件）和日志级别过滤
- [ ] T098 [P] 在各模块中集成日志（使用统一的 logger）
- [ ] T099 [P] 创建 tests/unit/test_logging.py 测试日志配置

### Phase 9 任务清单（集成测试）

- [ ] T100 [P] 补充 tests/integration/test_config_loading.py 测试配置加载各种场景
- [ ] T101 [P] 补充 tests/integration/test_rule_matching.py 测试规则匹配边界情况
- [ ] T102 [P] 创建 tests/integration/test_error_handling.py 测试异常处理流程

### Phase 9 任务清单（性能测试）

- [ ] T103 创建 tests/performance/test_long_running.py 性能测试脚本
- [ ] T104 性能测试：连续运行 24 小时
  - 监控内存使用情况
  - 监控 CPU 使用情况
  - 验证无崩溃、无内存泄漏
  - 验证日志正常轮转
  - 记录性能指标（轮询延时、响应时间等）

### Phase 9 任务清单（文档）

- [X] T105 [P] 创建 docs/user-guide.md 用户使用手册
  - 安装步骤
  - 配置说明
  - 常见问题
- [X] T106 [P] 创建 docs/config-reference.md 配置文件参考
  - 所有配置项说明
  - 配置示例
- [X] T107 [P] 创建 docs/development.md 开发者指南
  - 项目结构
  - 开发环境搭建
  - 测试运行
- [X] T108 更新 README.md 添加快速开始和功能列表
- [ ] T109 测试：运行完整测试套件 pytest tests/ -v --cov（覆盖率 >= 80%）

**预计时间**: 4-5 小时

**最终里程碑**: 🎉 **项目完成！** 所有功能、测试和文档齐全

---

## 任务依赖关系

### 关键路径（MVP）

**阶段 1** → **阶段 2** → **阶段 3** → **阶段 4**（T001-T038，共 38 个任务）

**关键里程碑**:

- 阶段 1 完成：✅ 项目骨架
- 阶段 2 完成：✅ 配置系统
- 阶段 3 完成：✅ 规则引擎
- 阶段 4 完成：🎯 **MVP 完成！** 核心功能端到端可用

### 扩展功能依赖（v1.1+）

- **阶段 5**（多账号，T039-T050）依赖阶段 4，v1.1 扩展
- **阶段 6**（群组，T051-T062）依赖阶段 4，v1.1 扩展
- **阶段 7**（OCR，T063-T076）依赖阶段 4，v1.2 可选增强
- **阶段 8a**（基础 UI，T077-T086）依赖阶段 4，v1.2 扩展（P2）
- **阶段 8b**（高级 UI，T087-T094）依赖阶段 8a，v1.3+ 扩展（P3）
- **阶段 9**（日志、测试、文档，T095-T109）可在任意阶段穿插进行

### 并行执行建议

- **MVP（阶段 1-4）必须顺序完成**，确保核心功能稳定
- **阶段 5、6、7 可并行开发**（不同开发者或不同时间段）
- **阶段 8a 和 8b 必须顺序完成**（8b 依赖 8a）
- **阶段 9 的单元测试可在各阶段中穿插**，集成测试和文档在最后完成

---

## 验收标准

### MVP 验收（阶段 1-4 完成，T001-T038）

1. ✅ 可通过 CLI 启动单个账号：`teleflow run --config test_config.yaml`
2. ✅ 可加载并解析 YAML 配置文件（Pydantic 验证）
3. ✅ 可启动 Playwright 浏览器并复用已保存的会话
4. ✅ 可定位到指定聊天并检测未读消息
5. ✅ 可自动标记消息为已读
6. ✅ 收到包含关键词的消息后，在配置的延时后自动回复
7. ✅ 支持通配符匹配（`*`、`?`）和大小写控制
8. ✅ 单元测试覆盖率 >= 80%
9. ✅ 连续运行 1 小时无崩溃、无内存泄漏
10. ✅ 实现错误处理（Playwright 超时、登录失效、网络降级）

### v1.1 扩展验收（阶段 5-6 完成，T039-T062）

1. ✅ 支持同时运行多个账号（独立进程，隔离浏览器数据）
2. ✅ 支持通过邀请链接自动加入群组并发送欢迎消息
3. ✅ 群组消息参与自动已读和关键词回复
4. ✅ 支持信号处理（SIGINT/SIGTERM）优雅退出

### v1.2 可选增强验收（阶段 7-8a 完成，T063-T086）

1. ✅ （可选）支持 OCR 识别图片中的数字并在回复中引用
2. ✅ 提供桌面端基础 UI（账号状态监控 + 日志查看）

### v1.3+ 完整功能验收（阶段 8b-9 完成，T087-T109）

1. ✅ 提供桌面端高级 UI（配置编辑 + 进程管理）
2. ✅ 日志同时输出到控制台和文件，按天轮转
3. ✅ 集成测试覆盖核心流程
4. ✅ 性能测试：连续运行 24 小时无崩溃
5. ✅ 文档完整（用户指南、配置参考、开发者指南）

---

## 下一步行动

### 立即开始（MVP 优先）

1. **阶段 1**（T001-T006）：搭建项目骨架，预计 1-2 小时
2. **阶段 2**（T007-T014）：实现配置系统，预计 1.5-2 小时
3. **阶段 3**（T015-T020）：实现规则引擎，预计 2-2.5 小时
4. **阶段 4**（T021-T038）：集成 Telegram Web，预计 4-5 小时

**MVP 总预计时间**: 10-12 小时

### 扩展功能（v1.1+）

1. **阶段 5-6**（T039-T062）：多账号 + 群组，预计 4-5 小时
2. **阶段 7**（T063-T076）：OCR 可选增强，预计 2-2.5 小时
3. **阶段 8a-8b**（T077-T094）：桌面端 UI，预计 8-10 小时
4. **阶段 9**（T095-T109）：日志、测试、文档，预计 4-5 小时

**完整功能总预计时间**: 30-35 小时

### 实施纪律

- ✅ **严格遵守 MVP 范围**：阶段 1-4 完成前，不实现任何 v1.1+ 功能
- ✅ **持续测试**：每完成一个阶段，立即运行相关测试验证功能
- ✅ **增量交付**：MVP 稳定后，按版本规划逐步添加扩展功能
- ✅ **文档同步**：在开发过程中同步更新 README 和用户文档
- ✅ **禁止过度设计**：不提前实现多节点流程引擎、复杂UI等功能

---

**任务清单版本**: 2.0（重构版）  
**总任务数**: 109 个任务  
**MVP 任务数**: 38 个任务（阶段 1-4）  
**创建日期**: 2025-01-16  
**最后更新**: 2025-01-16
**建议开发周期**: 2-4 周（按每天 2-4 小时计算）
