#!/usr/bin/env pwsh
<#
.SYNOPSIS
智能客服系统统一停止脚本

.DESCRIPTION
停止所有相关服务进程

.EXAMPLE
.\stop-all.ps1
#>

Write-Host "🛑 智能客服系统停止中..." -ForegroundColor Yellow

# 停止Node.js进程（推荐服务）
Write-Host "📡 停止推荐服务..." -ForegroundColor Cyan
try {
    $NodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($NodeProcesses) {
        foreach ($Process in $NodeProcesses) {
            # 检查是否是我们的服务（通过工作目录或端口）
            try {
                $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction SilentlyContinue
                if ($ProcessInfo -and $ProcessInfo.CommandLine -like "*reply-recosvc*") {
                    Write-Host "  🔧 停止推荐服务进程 (PID: $($Process.Id))"
                    Stop-Process -Id $Process.Id -Force
                    Write-Host "  ✅ 推荐服务已停止" -ForegroundColor Green
                }
            }
            catch {
                # 如果无法获取详细信息，停止所有node进程
                Write-Host "  🔧 停止Node.js进程 (PID: $($Process.Id))"
                Stop-Process -Id $Process.Id -Force
            }
        }
    }
    else {
        Write-Host "  ℹ️ 没有发现Node.js进程" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ❌ 停止推荐服务时出错: $($_.Exception.Message)" -ForegroundColor Red
}

# 停止消息捕获相关进程
Write-Host "🎯 停止消息捕获服务..." -ForegroundColor Cyan
try {
    # 停止易翻译进程
    $EtransProcesses = Get-Process -Name "*易翻译*", "*etrans*", "*traneasy*" -ErrorAction SilentlyContinue
    if ($EtransProcesses) {
        foreach ($Process in $EtransProcesses) {
            Write-Host "  🔧 停止易翻译进程 (PID: $($Process.Id))"
            Stop-Process -Id $Process.Id -Force
        }
        Write-Host "  ✅ 易翻译进程已停止" -ForegroundColor Green
    }
    
    # 停止CDP相关的Chrome进程（谨慎操作）
    $ChromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
    if ($ChromeProcesses) {
        foreach ($Process in $ChromeProcesses) {
            try {
                $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction SilentlyContinue
                if ($ProcessInfo -and $ProcessInfo.CommandLine -like "*--remote-debugging-port*") {
                    Write-Host "  🔧 停止CDP Chrome进程 (PID: $($Process.Id))"
                    Stop-Process -Id $Process.Id -Force
                }
            }
            catch {
                # 忽略错误，避免停止用户正常使用的Chrome
            }
        }
    }
    
    # 停止消息捕获脚本
    $CaptureProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
            $ProcessInfo -and $ProcessInfo.CommandLine -like "*start-etrans*"
        }
        catch {
            $false
        }
    }
    
    if ($CaptureProcesses) {
        foreach ($Process in $CaptureProcesses) {
            Write-Host "  🔧 停止消息捕获脚本 (PID: $($Process.Id))"
            Stop-Process -Id $Process.Id -Force
        }
        Write-Host "  ✅ 消息捕获脚本已停止" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ❌ 停止消息捕获服务时出错: $($_.Exception.Message)" -ForegroundColor Red
}

# 停止Python主应用
Write-Host "🖥️ 停止主应用程序..." -ForegroundColor Cyan
try {
    $PythonProcesses = Get-Process -Name "python*" -ErrorAction SilentlyContinue
    if ($PythonProcesses) {
        foreach ($Process in $PythonProcesses) {
            try {
                $ProcessInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction SilentlyContinue
                if ($ProcessInfo -and ($ProcessInfo.CommandLine -like "*quickreply*" -or $ProcessInfo.CommandLine -like "*phrase_tools*")) {
                    Write-Host "  🔧 停止Python应用 (PID: $($Process.Id))"
                    Stop-Process -Id $Process.Id -Force
                    Write-Host "  ✅ Python应用已停止" -ForegroundColor Green
                }
            }
            catch {
                # 忽略错误，避免停止其他Python应用
            }
        }
    }
    else {
        Write-Host "  ℹ️ 没有发现Python进程" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ❌ 停止Python应用时出错: $($_.Exception.Message)" -ForegroundColor Red
}

# 检查端口占用情况
Write-Host "🔍 检查端口占用情况..." -ForegroundColor Cyan
$Ports = @(7788, 7799)

foreach ($Port in $Ports) {
    try {
        $Connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($Connection) {
            Write-Host "  ⚠️ 端口 $Port 仍被占用 (PID: $($Connection.OwningProcess))" -ForegroundColor Yellow
            
            # 尝试停止占用端口的进程
            try {
                $Process = Get-Process -Id $Connection.OwningProcess -ErrorAction SilentlyContinue
                if ($Process) {
                    Write-Host "    🔧 尝试停止进程: $($Process.ProcessName) (PID: $($Process.Id))"
                    Stop-Process -Id $Process.Id -Force
                    Write-Host "    ✅ 进程已停止" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "    ❌ 无法停止进程: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "  ✅ 端口 $Port 已释放" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  ✅ 端口 $Port 已释放" -ForegroundColor Green
    }
}

Write-Host "`n🎉 停止完成！" -ForegroundColor Green
Write-Host "💡 如果仍有进程残留，请手动检查任务管理器" -ForegroundColor Gray

# 等待用户确认
Write-Host "`n按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

