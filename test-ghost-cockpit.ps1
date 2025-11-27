#!/usr/bin/env pwsh
# 【幽灵座舱】快速验证脚本
# 用途: 测试已实现的核心功能

Write-Host "==== 幽灵座舱 Phase 1 验证 ====" -ForegroundColor Cyan

# 步骤1: 编译检查
Write-Host "`n[1/3] 检查 Rust 编译..." -ForegroundColor Yellow
$compileResult = cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml 2\u003e\u00261
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 编译通过" -ForegroundColor Green
} else {
    Write-Host "❌ 编译失败,请检查错误信息" -ForegroundColor Red
    exit 1
}

# 步骤2: 运行应用 (启动HUD窗口)
Write-Host "`n[2/3] 启动应用 (将在后台启动)..." -ForegroundColor Yellow
Write-Host "提示: 应用将启动,请检查HUD窗口是否显示" -ForegroundColor Gray

# 启动应用 (仅启动,不阻塞)
$appProcess = Start-Process -FilePath "pnpm" -ArgumentList "tauri", "dev" -WorkingDirectory "apps/desktop" -PassThru -NoNewWindow

# 等待应用启动
Write-Host "等待5秒让应用启动..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 步骤3: 测试Demo命令
Write-Host "`n[3/3] 测试Demo命令..." -ForegroundColor Yellow
Write-Host "提示: 请在应用界面中执行以下操作:" -ForegroundColor Gray
Write-Host "  1. 打开开发者工具 (F12)" -ForegroundColor White
Write-Host "  2. 在控制台执行:" -ForegroundColor White
Write-Host "     await window.__TAURI__.core.invoke('ghost_cockpit_demo')" -ForegroundColor Cyan
Write-Host "  3. 检查HUD窗口是否显示'欢迎话术'分类" -ForegroundColor White
Write-Host "  4. 检查第2步是否高亮显示" -ForegroundColor White

Write-Host "`n验证清单:" -ForegroundColor Yellow
Write-Host "  □ HUD窗口已显示" -ForegroundColor White
Write-Host "  □ 分类名显示为'欢迎话术'" -ForegroundColor White  
Write-Host "  □ 当前步骤高亮 (蓝色边框)" -ForegroundColor White
Write-Host "  □ '发送'按钮可见" -ForegroundColor White

Write-Host "`n按任意键停止应用..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# 停止应用
if ($appProcess -and !$appProcess.HasExited) {
    Stop-Process -Id $appProcess.Id -Force
    Write-Host "应用已停止" -ForegroundColor Gray
}

Write-Host "`n验证完成!" -ForegroundColor Cyan
