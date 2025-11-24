# Repository Guidelines

## Project Structure & Module Organization
- `PoSend.exe` 和 `runtimes/` 提供自包含的 .NET 6 Windows Desktop 运行时；`Install/` 保存 WebView2 依赖，`e_lib/` 存放附带的 dotnet/资源/emoji。
- 业务数据位于 `data/database.db`（SQLite），图片和缩略图分别在 `data/Image/` 与 `temp/PreviewImage_50/`；语言与 UI 资源在 `lang/Preset@*.xaml`。
- 配置通过 `setting.ini` 和 `[adsorb-extend]` 开关驱动；所有修改都需在此文件及相应资源字典同步。

## Build, Test, and Development Commands
- `./PoSend.exe`：在当前目录运行客户端（建议使用 PowerShell `Start-Process` 并观察日志）。
- `sqlite3 data/database.db "SELECT COUNT(*) FROM word_list;"`：快速验证数据迁移或导入是否成功。
- `pwsh -Command "Get-ChildItem lang"`：确认本地化资源是否齐全，避免遗漏语言文件。

## Coding Style & Naming Conventions
- XAML 使用 4 空格缩进，资源键遵循 `string.section.action` 模式，例如 `string.list.copy`；保持中英文键一一对应。
- 若补充 C#/WPF 源码，沿用 MVVM 分层，类名使用 PascalCase，私有字段 `_camelCase`。
- SQLite 表、列名沿用 `snake_case`，新增字段需提供默认值以兼容旧数据。

## Testing Guidelines
- 无自动化测试框架；提交前需手动验证：运行应用、加载至少一个分类、导出 Excel/POF，并回放剪贴板恢复功能。
- 数据层变更需执行 `sqlite3` 验证查询并检查 `data/Image/` 是否存在孤立文件。

## Commit & Pull Request Guidelines
- 当前仓库缺少可查历史，统一使用 Conventional Commits（如 `feat: add multilingual preset sync`）。
- PR 描述需包含：变更摘要、受影响目录、验证步骤（附命令或截图），若涉及配置/数据库，附迁移脚本说明。

## Security & Configuration Tips
- 不要直接上传 `data/database.db` 的生产副本；如需示例，请脱敏或使用空库。
- 账号隔离相关实验应在独立目录（如 `data/<account>/`）完成，确认热键/吸附配置不会交叉污染。
