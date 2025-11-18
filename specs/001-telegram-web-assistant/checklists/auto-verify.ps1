# 自动化质量检查验证脚本
# 用途：批量验证 requirements-quality.md 中的机械检查项

param(
    [string]$SpecDir = "C:\Users\hybnb\Desktop\xiaohao\specs\001-telegram-web-assistant"
)

Write-Host "=== 质量检查自动化验证脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 检查文档是否存在
$docs = @{
    "constitution.md" = $false
    "spec.md" = $false
    "plan.md" = $false
    "tasks.md" = $false
}

Write-Host ">>> 步骤 1: 检查文档存在性" -ForegroundColor Yellow
foreach ($doc in $docs.Keys) {
    $path = Join-Path $SpecDir $doc
    $exists = Test-Path $path
    $docs[$doc] = $exists
    
    if ($exists) {
        Write-Host "  ✓ $doc 存在" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $doc 缺失" -ForegroundColor Red
    }
}
Write-Host ""

# 统计结果
$results = @{
    "auto_pass" = 0
    "auto_fail" = 0
    "needs_manual" = 0
    "constitution_na" = 0
}

# 检查 Constitution.md 相关项
if (-not $docs["constitution.md"]) {
    Write-Host ">>> Constitution.md 缺失，以下检查项标记为 N/A:" -ForegroundColor Yellow
    $constitutionChecks = @(
        "CHK001: MVP 范围定义 (4项)"
        "CHK002: 版本路线图清晰度 (3项)"
        "CHK003: 配置驱动原则 (1项 Constitution)"
        "CHK006: YAML 配置格式 (1项 Constitution)"
        "CHK042: Constitution 与 Spec 一致性 (3项)"
    )
    
    foreach ($check in $constitutionChecks) {
        Write-Host "  ⊘ $check" -ForegroundColor DarkGray
    }
    $results["constitution_na"] = 12  # 约12项受影响
    Write-Host ""
}

# 读取并分析 spec.md
if ($docs["spec.md"]) {
    Write-Host ">>> 步骤 2: 分析 spec.md" -ForegroundColor Yellow
    $specContent = Get-Content (Join-Path $SpecDir "spec.md") -Raw
    
    # 检查关键章节是否存在
    $sections = @(
        "## 功能需求",
        "## 非功能需求",
        "## 账号配置",
        "## 自动已读",
        "## 关键词回复",
        "MVP",
        "v1.0"
    )
    
    foreach ($section in $sections) {
        if ($specContent -match [regex]::Escape($section)) {
            Write-Host "  ✓ 找到章节: $section" -ForegroundColor Green
            $results["auto_pass"]++
        } else {
            Write-Host "  ⚠ 缺少章节: $section" -ForegroundColor Yellow
            $results["needs_manual"]++
        }
    }
    Write-Host ""
}

# 读取并分析 plan.md
if ($docs["plan.md"]) {
    Write-Host ">>> 步骤 3: 分析 plan.md" -ForegroundColor Yellow
    $planContent = Get-Content (Join-Path $SpecDir "plan.md") -Raw
    
    # 检查技术选型
    $techStack = @(
        "Python 3.11",
        "Playwright",
        "Pydantic",
        "YAML",
        "pyyaml"
    )
    
    foreach ($tech in $techStack) {
        if ($planContent -match [regex]::Escape($tech)) {
            Write-Host "  ✓ 找到技术: $tech" -ForegroundColor Green
            $results["auto_pass"]++
        } else {
            Write-Host "  ⚠ 缺少技术: $tech" -ForegroundColor Yellow
            $results["needs_manual"]++
        }
    }
    Write-Host ""
}

# 读取并分析 tasks.md
if ($docs["tasks.md"]) {
    Write-Host ">>> 步骤 4: 分析 tasks.md" -ForegroundColor Yellow
    $tasksContent = Get-Content (Join-Path $SpecDir "tasks.md") -Raw
    
    # 统计任务数量
    $taskMatches = [regex]::Matches($tasksContent, '(?m)^###\s+T\d+:')
    $taskCount = $taskMatches.Count
    Write-Host "  ℹ 总任务数: $taskCount" -ForegroundColor Cyan
    
    # 检查关键任务是否存在
    $keyTasks = @(
        "T001:",
        "T007:",  # 数据模型
        "T012:",  # 配置测试
        "T015:",  # 规则引擎
        "T033:",  # 集成测试
        "T100:",  # E2E测试
        "MVP"
    )
    
    foreach ($task in $keyTasks) {
        if ($tasksContent -match [regex]::Escape($task)) {
            Write-Host "  ✓ 找到任务: $task" -ForegroundColor Green
            $results["auto_pass"]++
        } else {
            Write-Host "  ⚠ 缺少任务: $task" -ForegroundColor Yellow
            $results["needs_manual"]++
        }
    }
    Write-Host ""
}

# 输出统计报告
Write-Host "=== 自动验证统计报告 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  自动通过: $($results['auto_pass']) 项" -ForegroundColor Green
Write-Host "  自动失败: $($results['auto_fail']) 项" -ForegroundColor Red
Write-Host "  需要人工审核: $($results['needs_manual']) 项" -ForegroundColor Yellow
Write-Host "  Constitution 缺失影响: $($results['constitution_na']) 项" -ForegroundColor DarkGray
Write-Host ""

$totalChecked = $results['auto_pass'] + $results['auto_fail'] + $results['needs_manual']
$totalItems = 152
$remainingManual = $totalItems - $totalChecked - $results['constitution_na']

Write-Host "  总检查项: $totalItems" -ForegroundColor Cyan
Write-Host "  已自动检查: $totalChecked" -ForegroundColor Cyan
Write-Host "  剩余需人工审核: $remainingManual" -ForegroundColor Cyan
Write-Host ""

# 计算预计时间
$autoTime = 5  # 已完成
$structuralTime = [math]::Ceiling($remainingManual / 10) * 2  # 每10项约2分钟
$semanticTime = [math]::Ceiling($remainingManual / 20) * 5  # 每20项约5分钟
$totalTime = $autoTime + $structuralTime + $semanticTime

Write-Host "  预计剩余时间: $totalTime 分钟" -ForegroundColor Cyan
Write-Host "    - 机械检查: 已完成 (5分钟)" -ForegroundColor Green
Write-Host "    - 结构检查: ~$structuralTime 分钟" -ForegroundColor Yellow
Write-Host "    - 语义检查: ~$semanticTime 分钟" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== 下一步建议 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ⚠️ 创建 constitution.md 或将 12 项标记为 N/A" -ForegroundColor Yellow
Write-Host "2. 📋 手动审核剩余 $remainingManual 项" -ForegroundColor Yellow
Write-Host "3. ✅ 批量更新 requirements-quality.md" -ForegroundColor Yellow
Write-Host "4. 🚀 执行 tasks.md 中的实现任务" -ForegroundColor Green
Write-Host ""
