# Windows SDK 环境诊断报告

## 诊断结果

### ✅ 已安装的组件
1. **Rust工具链**: rustc 1.91.1 (2025-10-10)
2. **Cargo**: 1.91.1
3. **Windows SDK**: Windows 10 SDK (位于 `C:\Program Files (x86)\Windows Kits\10`)
4. **RC.EXE**: 已找到 (位于 `C:\Program Files (x86)\Windows Kits\10\bin\[version]\x64\rc.exe`)

### ❌ 问题诊断
**核心问题**: `rc.exe` 不在系统PATH环境变量中

**症状**:
```
Error: RC.EXE failed to compile specified resource file
thread 'main' panicked at tauri-winres-0.3.5\src\lib.rs:536:14
```

**原因**:
- `tauri-winres` 通过PATH查找 `rc.exe`
- Windows SDK的bin目录未添加到PATH
- 导致构建时找不到资源编译器

## 解决方案

### 方案1: 添加到PATH（推荐）

#### PowerShell命令（当前会话生效）:
```powershell
# 1. 查找rc.exe路径
$rcPath = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\rc.exe" | 
          Select-Object -First 1 -ExpandProperty DirectoryName

# 2. 添加到当前PATH
$env:Path += ";$rcPath"

# 3. 验证
where.exe rc.exe
```

#### 永久添加PATH（系统级）:
1. Win+R 打开运行
2. 输入 `sysdm.cpl` 回车
3. 点击"高级" → "环境变量"
4. 在"系统变量"中找到Path，点击"编辑"
5. 点击"新建"，添加路径（例如）:
   ```
   C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64
   ```
6. 确定保存
7. **重启终端**

### 方案2: 使用Developer Command Prompt（快速）

直接使用Visual Studio提供的开发者命令行：
1. 打开"Developer Command Prompt for VS 2022"
2. 导航到项目目录
3. 运行 `cargo build`

### 方案3: 修改Cargo配置（临时）

在 `src-tauri/.cargo/config.toml` 中添加：
```toml
[env]
PATH = { value = "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64", relative = true }
```

## 验证步骤

完成修复后，运行以下命令验证：

```powershell
# 1. 检查rc.exe是否可访问
where rc.exe

# 2. 测试编译
cd src-tauri
cargo clean
cargo build

# 3. 如果成功，运行完整开发环境
cd ..
pnpm tauri dev
```

## 预期结果

修复后应该看到：
```
Compiling teleflow-desktop v0.0.0
    Finished dev [unoptimized + debuginfo] target(s) in XXs
```

## 替代方案（如果上述都失败）

如果Windows SDK问题持续，可以考虑：

1. **重新安装Windows SDK**:
   - 下载: https://developer.microsoft.com/windows/downloads/windows-sdk/
   - 确保安装"Windows SDK for Desktop C++ Apps"组件

2. **安装Visual Studio Build Tools**:
   ```powershell
   # 使用Chocolatey
   choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
   ```

3. **使用WSL2（作为备选）**:
   如果仍然有问题，可以在WSL2 Ubuntu中开发Rust部分

## 快速验证脚本

创建 `check-sdk.ps1`:
```powershell
Write-Host "检查Windows SDK环境..." -ForegroundColor Cyan

# 检查rc.exe
$rc = Get-Command rc.exe -ErrorAction SilentlyContinue
if ($rc) {
    Write-Host "✓ rc.exe 找到: $($rc.Source)" -ForegroundColor Green
} else {
    Write-Host "✗ rc.exe 未找到" -ForegroundColor Red
    $rcPath = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\rc.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($rcPath) {
        Write-Host "  找到RC.EXE但不在PATH: $($rcPath.FullName)" -ForegroundColor Yellow
    }
}

# 检查Rust
$rust = rustc --version
Write-Host "✓ Rust: $rust" -ForegroundColor Green

# 检查Cargo
$cargo = cargo --version
Write-Host "✓ Cargo: $cargo" -ForegroundColor Green

Write-Host "`n建议: 将Windows SDK bin目录添加到PATH环境变量" -ForegroundColor Yellow
```

运行: `./check-sdk.ps1`

---

**总结**: 问题已定位，只需将Windows SDK的bin目录添加到PATH即可解决编译问题。
