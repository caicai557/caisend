# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "需要管理员权限,正在请求提升..." -ForegroundColor Yellow
    # 以管理员身份重新启动脚本
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "已获得管理员权限,开始监控进程..." -ForegroundColor Green

# 进程启动监控
Register-WmiEvent -Class Win32_ProcessStartTrace -Action {
    $name = $Event.SourceEventArgs.NewEvent.ProcessName
    $cmd  = $Event.SourceEventArgs.NewEvent.CommandLine
    Write-Host "`n==== 新进程启动 ====" -ForegroundColor Green
    Write-Host "进程: $name" -ForegroundColor Cyan
    if ($cmd) {
        Write-Host "命令行: $cmd" -ForegroundColor Yellow
    }
}

Write-Host "`n进程监控已启动!" -ForegroundColor Magenta
Write-Host "现在会实时显示所有新启动的进程" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止监控...`n" -ForegroundColor Yellow

# 保持脚本运行
while ($true) {
    Start-Sleep -Seconds 1
}
