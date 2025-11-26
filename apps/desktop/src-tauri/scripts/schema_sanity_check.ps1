Param(
  [string]$DbPath = "src-tauri\accounts.db"
)

if (-not (Test-Path $DbPath)) {
  Write-Error "Database not found at $DbPath"
  exit 1
}

function Show-PragmaTableInfo($table) {
  $query = "PRAGMA table_info($table);"
  $result = sqlite3 $DbPath $query 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to read pragma for $table"
    return
  }
  Write-Host "`n$table"
  Write-Host "--------------"
  $result -split "`n" | ForEach-Object { Write-Host $_ }
}

Write-Host "== Schema Sanity Check ==" -ForegroundColor Cyan
Write-Host "DB:" (Resolve-Path $DbPath)

Show-PragmaTableInfo "rules"
Show-PragmaTableInfo "workflows"

Write-Host "`n_rules_count: " (sqlite3 $DbPath "SELECT COUNT(*) FROM rules;")
Write-Host "_workflows_count: " (sqlite3 $DbPath "SELECT COUNT(*) FROM workflows;" 2>$null)
