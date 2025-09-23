#!/usr/bin/env pwsh
<#
.SYNOPSIS
智能客服系统简化启动脚本

.DESCRIPTION
快速启动所有服务组件的简化版本

.EXAMPLE
.\start-all-simple.ps1
#>

param(
    [string]$EtransPath = "",
    [switch]$NoUI
)

Write-Host "🚀 智能客服系统启动中..." -ForegroundColor Green

# 检查并启动推荐服务
Write-Host "📡 启动推荐服务..." -ForegroundColor Cyan
$RecommendDir = "C:\dev\reply-recosvc"

if (Test-Path $RecommendDir) {
    try {
        # 检查端口是否被占用
        $Port7788 = Get-NetTCPConnection -LocalPort 7788 -State Listen -ErrorAction SilentlyContinue
        if ($Port7788) {
            Write-Host "  ⚠️ 推荐服务已在运行 (端口7788被占用)" -ForegroundColor Yellow
        }
        else {
            Push-Location $RecommendDir
            Write-Host "  🔧 启动Node.js推荐服务..."
            Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WindowStyle Minimized
            Pop-Location
            Write-Host "  ✅ 推荐服务启动命令已执行" -ForegroundColor Green
            Start-Sleep -Seconds 3
        }
    }
    catch {
        Write-Host "  ❌ 推荐服务启动失败: $($_.Exception.Message)" -ForegroundColor Red
        Pop-Location
    }
}
else {
    Write-Host "  ❌ 推荐服务目录不存在: $RecommendDir" -ForegroundColor Red
}

# 检查并启动消息捕获服务
Write-Host "🎯 启动消息捕获服务..." -ForegroundColor Cyan
$CaptureDir = "C:\dev\chat-capture"
$StartScript = "$CaptureDir\start-etrans.ps1"

if (Test-Path $StartScript) {
    try {
        # 检查端口是否被占用
        $Port7799 = Get-NetTCPConnection -LocalPort 7799 -State Listen -ErrorAction SilentlyContinue
        if ($Port7799) {
            Write-Host "  ⚠️ 消息捕获服务已在运行 (端口7799被占用)" -ForegroundColor Yellow
        }
        else {
            Push-Location $CaptureDir
            
            if ($EtransPath) {
                Write-Host "  🔧 使用自定义易翻译路径: $EtransPath"
                Start-Process -FilePath "powershell.exe" -ArgumentList "-File", $StartScript, "-EtransPath", "`"$EtransPath`"" -WindowStyle Minimized
            }
            else {
                Write-Host "  🔧 启动消息捕获服务..."
                Start-Process -FilePath "powershell.exe" -ArgumentList "-File", $StartScript -WindowStyle Minimized
            }
            
            Pop-Location
            Write-Host "  ✅ 消息捕获服务启动命令已执行" -ForegroundColor Green
            Start-Sleep -Seconds 3
        }
    }
    catch {
        Write-Host "  ❌ 消息捕获服务启动失败: $($_.Exception.Message)" -ForegroundColor Red
        Pop-Location
    }
}
else {
    Write-Host "  ❌ 消息捕获脚本不存在: $StartScript" -ForegroundColor Red
}

# 启动主应用程序
if (!$NoUI) {
    Write-Host "🖥️ 启动主应用程序..." -ForegroundColor Cyan
    
    try {
        # 检查虚拟环境
        $VenvPath = ".\.venv\Scripts\Activate.ps1"
        if (Test-Path $VenvPath) {
            Write-Host "  🐍 激活Python虚拟环境..."
            & $VenvPath
        }
        
        Write-Host "  🔧 启动Python主应用..."
        Start-Process -FilePath "python" -ArgumentList "-m", "quickreply" -WindowStyle Normal
        Write-Host "  ✅ 主应用程序启动命令已执行" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ 主应用程序启动失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 显示状态信息
Write-Host "`n🎉 启动完成！" -ForegroundColor Green
Write-Host "📊 服务状态检查:" -ForegroundColor Cyan

# 等待服务启动
Write-Host "⏳ 等待服务就绪..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 检查推荐服务
try {
    $Response = Invoke-RestMethod -Uri "http://127.0.0.1:7788/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($Response) {
        Write-Host "  ✅ 推荐服务: 正常运行 (http://127.0.0.1:7788)" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠️ 推荐服务: 可能仍在启动中" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  ❌ 推荐服务: 无响应" -ForegroundColor Red
}

# 检查消息捕获服务
$Port7799Check = Get-NetTCPConnection -LocalPort 7799 -State Listen -ErrorAction SilentlyContinue
if ($Port7799Check) {
    Write-Host "  ✅ 消息捕获服务: 正常运行 (WebSocket端口 7799)" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️ 消息捕获服务: 端口7799未监听" -ForegroundColor Yellow
}

# 使用说明
Write-Host "`n📋 使用说明:" -ForegroundColor Cyan
Write-Host "  🌐 推荐服务管理: http://127.0.0.1:7788/health" 
Write-Host "  📊 服务指标: http://127.0.0.1:7788/metrics"
Write-Host "  🔧 话术管理: python phrase_tools.py ui"
Write-Host "  📥 数据导入: python phrase_tools.py import --help"

if (!$NoUI) {
    Write-Host "`n💡 主应用程序已启动，请查看新窗口" -ForegroundColor Magenta
}

Write-Host "`n🔄 要重新启动服务，请关闭相关进程后重新运行此脚本" -ForegroundColor Gray

