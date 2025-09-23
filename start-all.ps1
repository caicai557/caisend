#!/usr/bin/env pwsh
<#
.SYNOPSIS
智能客服系统统一启动脚本

.DESCRIPTION
一键启动所有必需的服务组件：
- 推荐服务 (Node.js)
- 消息捕获服务 (CDP)
- 主应用程序 (Python)

.PARAMETER SkipRecommendService
跳过启动推荐服务

.PARAMETER SkipCaptureService
跳过启动消息捕获服务

.PARAMETER SkipMainApp
跳过启动主应用程序

.PARAMETER EtransPath
易翻译程序路径（可选）

.PARAMETER LogLevel
日志级别 (INFO, DEBUG, WARN, ERROR)

.EXAMPLE
.\start-all.ps1
启动所有服务

.EXAMPLE
.\start-all.ps1 -SkipMainApp
只启动后台服务，不启动UI

.EXAMPLE
.\start-all.ps1 -EtransPath "C:\Custom\Path\易翻译.exe"
使用自定义易翻译路径启动
#>

param(
    [switch]$SkipRecommendService,
    [switch]$SkipCaptureService,
    [switch]$SkipMainApp,
    [string]$EtransPath = "",
    [ValidateSet("INFO", "DEBUG", "WARN", "ERROR")]
    [string]$LogLevel = "INFO",
    [switch]$Help
)

# 显示帮助信息
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Definition -Detailed
    exit 0
}

# 设置错误处理
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# 全局变量
$script:StartedProcesses = @()
$script:LogFile = "logs\start-all-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').log"

# 创建日志目录
$LogDir = Split-Path $script:LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# 日志记录函数
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # 控制台输出（带颜色）
    switch ($Level) {
        "INFO"  { Write-Host $LogEntry -ForegroundColor Green }
        "WARN"  { Write-Host $LogEntry -ForegroundColor Yellow }
        "ERROR" { Write-Host $LogEntry -ForegroundColor Red }
        "DEBUG" { if ($LogLevel -eq "DEBUG") { Write-Host $LogEntry -ForegroundColor Cyan } }
    }
    
    # 文件输出
    Add-Content -Path $script:LogFile -Value $LogEntry -Encoding UTF8
}

# 检查进程是否运行
function Test-ProcessRunning {
    param(
        [string]$ProcessName,
        [string]$WindowTitle = "",
        [int]$Port = 0
    )
    
    # 检查进程名
    if ($ProcessName) {
        $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        if ($Process) {
            Write-Log "检测到 $ProcessName 进程正在运行 (PID: $($Process.Id))" "DEBUG"
            return $true
        }
    }
    
    # 检查端口占用
    if ($Port -gt 0) {
        try {
            $Connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($Connection) {
                Write-Log "检测到端口 $Port 被占用" "DEBUG"
                return $true
            }
        }
        catch {
            # 端口检查失败，继续
        }
    }
    
    return $false
}

# 等待服务就绪
function Wait-ServiceReady {
    param(
        [string]$ServiceName,
        [string]$HealthUrl,
        [int]$TimeoutSeconds = 30,
        [int]$CheckIntervalSeconds = 2
    )
    
    Write-Log "等待 $ServiceName 服务就绪..." "INFO"
    
    $StartTime = Get-Date
    $TimeoutTime = $StartTime.AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $TimeoutTime) {
        try {
            $Response = Invoke-RestMethod -Uri $HealthUrl -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($Response) {
                Write-Log "$ServiceName 服务已就绪" "INFO"
                return $true
            }
        }
        catch {
            # 继续等待
        }
        
        Start-Sleep -Seconds $CheckIntervalSeconds
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    Write-Log "$ServiceName 服务在 $TimeoutSeconds 秒内未就绪" "WARN"
    return $false
}

# 启动推荐服务
function Start-RecommendService {
    Write-Log "🔧 启动推荐服务..." "INFO"
    
    # 检查是否已运行
    if (Test-ProcessRunning -Port 7788) {
        Write-Log "推荐服务已在运行，跳过启动" "WARN"
        return $true
    }
    
    # 检查目录和依赖
    $RecommendDir = "C:\dev\reply-recosvc"
    if (!(Test-Path $RecommendDir)) {
        Write-Log "推荐服务目录不存在: $RecommendDir" "ERROR"
        return $false
    }
    
    if (!(Test-Path "$RecommendDir\package.json")) {
        Write-Log "推荐服务package.json不存在" "ERROR"
        return $false
    }
    
    # 检查Node.js
    try {
        $NodeVersion = node --version 2>$null
        Write-Log "Node.js版本: $NodeVersion" "DEBUG"
    }
    catch {
        Write-Log "Node.js未安装或不在PATH中" "ERROR"
        return $false
    }
    
    # 检查依赖
    if (!(Test-Path "$RecommendDir\node_modules")) {
        Write-Log "正在安装Node.js依赖..." "INFO"
        try {
            Push-Location $RecommendDir
            npm install --silent
            Pop-Location
            Write-Log "依赖安装完成" "INFO"
        }
        catch {
            Write-Log "依赖安装失败: $($_.Exception.Message)" "ERROR"
            Pop-Location
            return $false
        }
    }
    
    # 启动服务
    try {
        Push-Location $RecommendDir
        $Process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden -PassThru
        Pop-Location
        
        $script:StartedProcesses += @{
            Name = "推荐服务"
            Process = $Process
            Type = "RecommendService"
        }
        
        Write-Log "推荐服务已启动 (PID: $($Process.Id))" "INFO"
        
        # 等待服务就绪
        if (Wait-ServiceReady -ServiceName "推荐服务" -HealthUrl "http://127.0.0.1:7788/health") {
            return $true
        }
        else {
            Write-Log "推荐服务启动超时，但继续执行" "WARN"
            return $true
        }
    }
    catch {
        Write-Log "推荐服务启动失败: $($_.Exception.Message)" "ERROR"
        Pop-Location
        return $false
    }
}

# 启动消息捕获服务
function Start-CaptureService {
    Write-Log "📡 启动消息捕获服务..." "INFO"
    
    # 检查是否已运行
    if (Test-ProcessRunning -Port 7799) {
        Write-Log "消息捕获服务已在运行，跳过启动" "WARN"
        return $true
    }
    
    # 检查目录
    $CaptureDir = "C:\dev\chat-capture"
    if (!(Test-Path $CaptureDir)) {
        Write-Log "消息捕获服务目录不存在: $CaptureDir" "ERROR"
        return $false
    }
    
    $StartScript = "$CaptureDir\start-etrans.ps1"
    if (!(Test-Path $StartScript)) {
        Write-Log "启动脚本不存在: $StartScript" "ERROR"
        return $false
    }
    
    # 准备启动参数
    $Arguments = @()
    if ($EtransPath) {
        $Arguments += "-EtransPath", "`"$EtransPath`""
    }
    
    # 启动服务
    try {
        Push-Location $CaptureDir
        
        if ($Arguments.Count -gt 0) {
            $Process = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", $StartScript, $Arguments -WindowStyle Hidden -PassThru
        }
        else {
            $Process = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", $StartScript -WindowStyle Hidden -PassThru
        }
        
        Pop-Location
        
        $script:StartedProcesses += @{
            Name = "消息捕获服务"
            Process = $Process
            Type = "CaptureService"
        }
        
        Write-Log "消息捕获服务已启动 (PID: $($Process.Id))" "INFO"
        
        # 等待服务就绪
        Start-Sleep -Seconds 3
        if (Test-ProcessRunning -Port 7799) {
            Write-Log "消息捕获服务已就绪" "INFO"
            return $true
        }
        else {
            Write-Log "消息捕获服务可能未完全启动，但继续执行" "WARN"
            return $true
        }
    }
    catch {
        Write-Log "消息捕获服务启动失败: $($_.Exception.Message)" "ERROR"
        Pop-Location
        return $false
    }
}

# 启动主应用程序
function Start-MainApp {
    Write-Log "🖥️ 启动主应用程序..." "INFO"
    
    # 检查Python环境
    try {
        $PythonVersion = python --version 2>$null
        Write-Log "Python版本: $PythonVersion" "DEBUG"
    }
    catch {
        Write-Log "Python未安装或不在PATH中" "ERROR"
        return $false
    }
    
    # 检查虚拟环境
    $VenvPath = ".\.venv\Scripts\Activate.ps1"
    if (Test-Path $VenvPath) {
        Write-Log "激活Python虚拟环境..." "INFO"
        try {
            & $VenvPath
        }
        catch {
            Write-Log "虚拟环境激活失败，使用系统Python" "WARN"
        }
    }
    
    # 检查quickreply模块
    try {
        python -c "import quickreply" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "quickreply模块不可用，请检查安装" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "quickreply模块检查失败" "ERROR"
        return $false
    }
    
    # 启动主应用
    try {
        $Process = Start-Process -FilePath "python" -ArgumentList "-m", "quickreply" -WindowStyle Normal -PassThru
        
        $script:StartedProcesses += @{
            Name = "主应用程序"
            Process = $Process
            Type = "MainApp"
        }
        
        Write-Log "主应用程序已启动 (PID: $($Process.Id))" "INFO"
        return $true
    }
    catch {
        Write-Log "主应用程序启动失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 清理函数
function Stop-AllServices {
    Write-Log "🛑 正在停止所有启动的服务..." "INFO"
    
    foreach ($ServiceInfo in $script:StartedProcesses) {
        try {
            if (!$ServiceInfo.Process.HasExited) {
                Write-Log "停止 $($ServiceInfo.Name) (PID: $($ServiceInfo.Process.Id))" "INFO"
                $ServiceInfo.Process.Kill()
                $ServiceInfo.Process.WaitForExit(5000)
            }
        }
        catch {
            Write-Log "停止 $($ServiceInfo.Name) 时出错: $($_.Exception.Message)" "WARN"
        }
    }
    
    Write-Log "所有服务已停止" "INFO"
}

# 信号处理
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Stop-AllServices
}

# 主函数
function Main {
    Write-Log "🚀 智能客服系统统一启动脚本" "INFO"
    Write-Log "日志文件: $script:LogFile" "INFO"
    Write-Log "启动参数: SkipRecommend=$SkipRecommendService, SkipCapture=$SkipCaptureService, SkipMain=$SkipMainApp" "DEBUG"
    
    $Success = $true
    
    try {
        # 启动推荐服务
        if (!$SkipRecommendService) {
            if (!(Start-RecommendService)) {
                $Success = $false
            }
            Start-Sleep -Seconds 2
        }
        
        # 启动消息捕获服务
        if (!$SkipCaptureService) {
            if (!(Start-CaptureService)) {
                $Success = $false
            }
            Start-Sleep -Seconds 2
        }
        
        # 启动主应用程序
        if (!$SkipMainApp) {
            if (!(Start-MainApp)) {
                $Success = $false
            }
        }
        
        if ($Success) {
            Write-Log "🎉 所有服务启动完成！" "INFO"
            Write-Log "📊 运行状态:" "INFO"
            Write-Log "  - 推荐服务: http://127.0.0.1:7788/health" "INFO"
            Write-Log "  - 消息捕获: WebSocket端口 7799" "INFO"
            Write-Log "  - 主应用程序: 已启动" "INFO"
            
            # 保持脚本运行（如果启动了主应用）
            if (!$SkipMainApp) {
                Write-Log "按 Ctrl+C 停止所有服务" "INFO"
                try {
                    while ($true) {
                        Start-Sleep -Seconds 10
                        
                        # 检查进程状态
                        $AliveCount = 0
                        foreach ($ServiceInfo in $script:StartedProcesses) {
                            if (!$ServiceInfo.Process.HasExited) {
                                $AliveCount++
                            }
                        }
                        
                        if ($AliveCount -eq 0) {
                            Write-Log "所有启动的进程已退出" "INFO"
                            break
                        }
                    }
                }
                catch [System.Management.Automation.PipelineStoppedException] {
                    Write-Log "接收到停止信号" "INFO"
                }
            }
        }
        else {
            Write-Log "❌ 部分服务启动失败，请检查日志" "ERROR"
            exit 1
        }
    }
    catch {
        Write-Log "启动过程中发生错误: $($_.Exception.Message)" "ERROR"
        exit 1
    }
    finally {
        Stop-AllServices
    }
}

# 执行主函数
Main

