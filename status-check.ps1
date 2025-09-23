#!/usr/bin/env pwsh
<#
.SYNOPSIS
智能客服系统状态检查脚本

.DESCRIPTION
检查所有服务组件的运行状态

.EXAMPLE
.\status-check.ps1
#>

Write-Host "🔍 智能客服系统状态检查" -ForegroundColor Cyan
Write-Host "=" * 50

# 检查推荐服务
Write-Host "`n📡 推荐服务状态:" -ForegroundColor Yellow
try {
    # 检查端口
    $Port7788 = Get-NetTCPConnection -LocalPort 7788 -State Listen -ErrorAction SilentlyContinue
    if ($Port7788) {
        Write-Host "  ✅ 端口7788: 正在监听" -ForegroundColor Green
        
        # 检查进程
        $Process = Get-Process -Id $Port7788.OwningProcess -ErrorAction SilentlyContinue
        if ($Process) {
            Write-Host "  📊 进程: $($Process.ProcessName) (PID: $($Process.Id))" -ForegroundColor Green
        }
        
        # 检查健康状态
        try {
            $HealthResponse = Invoke-RestMethod -Uri "http://127.0.0.1:7788/health" -Method GET -TimeoutSec 5
            if ($HealthResponse -and $HealthResponse.status -eq "ok") {
                Write-Host "  ✅ 健康检查: 正常" -ForegroundColor Green
                Write-Host "  📈 运行时间: $($HealthResponse.uptime)" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️ 健康检查: 异常响应" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  ❌ 健康检查: 无响应" -ForegroundColor Red
        }
        
        # 检查指标
        try {
            $MetricsResponse = Invoke-RestMethod -Uri "http://127.0.0.1:7788/metrics" -Method GET -TimeoutSec 5
            if ($MetricsResponse) {
                Write-Host "  📊 指标端点: 可用" -ForegroundColor Green
                if ($MetricsResponse.requests) {
                    Write-Host "    - 总请求数: $($MetricsResponse.requests.total)" -ForegroundColor Cyan
                }
            }
        }
        catch {
            Write-Host "  ⚠️ 指标端点: 不可用" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  ❌ 端口7788: 未监听" -ForegroundColor Red
        Write-Host "  💡 启动命令: cd C:\dev\reply-recosvc && npm run dev" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ❌ 推荐服务检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 检查消息捕获服务
Write-Host "`n🎯 消息捕获服务状态:" -ForegroundColor Yellow
try {
    # 检查端口
    $Port7799 = Get-NetTCPConnection -LocalPort 7799 -State Listen -ErrorAction SilentlyContinue
    if ($Port7799) {
        Write-Host "  ✅ 端口7799: 正在监听 (WebSocket)" -ForegroundColor Green
        
        # 检查进程
        $Process = Get-Process -Id $Port7799.OwningProcess -ErrorAction SilentlyContinue
        if ($Process) {
            Write-Host "  📊 进程: $($Process.ProcessName) (PID: $($Process.Id))" -ForegroundColor Green
        }
    }
    else {
        Write-Host "  ❌ 端口7799: 未监听" -ForegroundColor Red
        Write-Host "  💡 启动命令: cd C:\dev\chat-capture && .\start-etrans.ps1" -ForegroundColor Gray
    }
    
    # 检查易翻译进程
    $EtransProcesses = Get-Process -Name "*易翻译*", "*etrans*", "*traneasy*" -ErrorAction SilentlyContinue
    if ($EtransProcesses) {
        Write-Host "  ✅ 易翻译进程: 运行中" -ForegroundColor Green
        foreach ($Process in $EtransProcesses) {
            Write-Host "    - $($Process.ProcessName) (PID: $($Process.Id))" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "  ❌ 易翻译进程: 未运行" -ForegroundColor Red
    }
    
    # 检查CDP Chrome进程
    $CDPProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
            $ProcessInfo -and $ProcessInfo.CommandLine -like "*--remote-debugging-port*"
        }
        catch {
            $false
        }
    }
    
    if ($CDPProcesses) {
        Write-Host "  ✅ CDP Chrome进程: 运行中" -ForegroundColor Green
        foreach ($Process in $CDPProcesses) {
            Write-Host "    - Chrome CDP (PID: $($Process.Id))" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "  ⚠️ CDP Chrome进程: 未检测到" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  ❌ 消息捕获服务检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 检查Python主应用
Write-Host "`n🖥️ Python主应用状态:" -ForegroundColor Yellow
try {
    $PythonProcesses = Get-Process -Name "python*" -ErrorAction SilentlyContinue
    $QuickReplyProcesses = @()
    
    foreach ($Process in $PythonProcesses) {
        try {
            $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction SilentlyContinue
            if ($ProcessInfo -and ($ProcessInfo.CommandLine -like "*quickreply*" -or $ProcessInfo.CommandLine -like "*phrase_tools*")) {
                $QuickReplyProcesses += $Process
            }
        }
        catch {
            # 忽略错误
        }
    }
    
    if ($QuickReplyProcesses) {
        Write-Host "  ✅ Python应用: 运行中" -ForegroundColor Green
        foreach ($Process in $QuickReplyProcesses) {
            Write-Host "    - $($Process.ProcessName) (PID: $($Process.Id))" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "  ❌ Python应用: 未运行" -ForegroundColor Red
        Write-Host "  💡 启动命令: python -m quickreply" -ForegroundColor Gray
    }
    
    # 检查Python环境
    try {
        $PythonVersion = python --version 2>$null
        if ($PythonVersion) {
            Write-Host "  📊 Python版本: $PythonVersion" -ForegroundColor Cyan
        }
        
        # 检查虚拟环境
        $VenvPath = ".\.venv\Scripts\Activate.ps1"
        if (Test-Path $VenvPath) {
            Write-Host "  🐍 虚拟环境: 可用" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠️ 虚拟环境: 未找到" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ❌ Python环境: 不可用" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ Python应用检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 检查配置文件
Write-Host "`n⚙️ 配置文件状态:" -ForegroundColor Yellow
$ConfigFiles = @(
    "config.json",
    "quickreply.config.json",
    "settings.json"
)

foreach ($ConfigFile in $ConfigFiles) {
    if (Test-Path $ConfigFile) {
        $FileInfo = Get-Item $ConfigFile
        Write-Host "  ✅ $ConfigFile (大小: $($FileInfo.Length) 字节, 修改: $($FileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ ${ConfigFile}: 不存在" -ForegroundColor Red
    }
}

# 检查日志文件
Write-Host "`n📝 日志文件状态:" -ForegroundColor Yellow
$LogDirs = @("logs", "C:\dev\reply-recosvc\logs", "C:\dev\chat-capture\logs")

foreach ($LogDir in $LogDirs) {
    if (Test-Path $LogDir) {
        $LogFiles = Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue
        if ($LogFiles) {
            Write-Host "  ✅ $LogDir (文件数: $($LogFiles.Count))" -ForegroundColor Green
            $LatestLog = $LogFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($LatestLog) {
                Write-Host "    - 最新: $($LatestLog.Name) ($($LatestLog.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor Cyan
            }
        }
        else {
            Write-Host "  ⚠️ ${LogDir}: 无日志文件" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  ❌ ${LogDir}: 目录不存在" -ForegroundColor Red
    }
}

# 总结
Write-Host "`n" + "=" * 50
Write-Host "📋 状态总结:" -ForegroundColor Cyan

$Services = @(
    @{Name="推荐服务"; Port=7788},
    @{Name="消息捕获"; Port=7799}
)

$RunningServices = 0
foreach ($Service in $Services) {
    $Connection = Get-NetTCPConnection -LocalPort $Service.Port -State Listen -ErrorAction SilentlyContinue
    if ($Connection) {
        Write-Host "  ✅ $($Service.Name): 运行中" -ForegroundColor Green
        $RunningServices++
    }
    else {
        Write-Host "  ❌ $($Service.Name): 未运行" -ForegroundColor Red
    }
}

if ($RunningServices -eq $Services.Count) {
    Write-Host "`n🎉 所有核心服务正常运行！" -ForegroundColor Green
}
elseif ($RunningServices -gt 0) {
    Write-Host "`n⚠️ 部分服务运行中，请检查未启动的服务" -ForegroundColor Yellow
}
else {
    Write-Host "`n❌ 所有服务均未运行，请执行启动脚本" -ForegroundColor Red
    Write-Host "💡 启动命令: .\start-all-simple.ps1" -ForegroundColor Gray
}

Write-Host "`n🔗 快速链接:" -ForegroundColor Cyan
Write-Host "  - 推荐服务健康检查: http://127.0.0.1:7788/health"
Write-Host "  - 推荐服务指标: http://127.0.0.1:7788/metrics"
Write-Host "  - 话术管理工具: python phrase_tools.py ui"
