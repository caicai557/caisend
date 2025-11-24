# 进程启动监控脚本
Register-WmiEvent -Class Win32_ProcessStartTrace -Action {
    $name = $Event.SourceEventArgs.NewEvent.ProcessName
    $cmd  = $Event.SourceEventArgs.NewEvent.CommandLine
    Write-Host "`n==== 新进程启动 ====" -ForegroundColor Green
    Write-Host "进程: $name" -ForegroundColor Cyan
    if ($cmd) {
        Write-Host "命令行: $cmd" -ForegroundColor Yellow
    }
}

Write-Host "进程监控已启动,按 Ctrl+C 停止..." -ForegroundColor Magenta

# 保持脚本运行
while ($true) {
    Start-Sleep -Seconds 1
}
