# Delete dead code files that remain on local disk.
# RUN AS ADMINISTRATOR (files are owned by another Windows account;
# Administrators have Full Control, so elevation is enough).
#
# Right-click PowerShell -> Run as administrator, then:
#   powershell -ExecutionPolicy Bypass -File "D:\VIbeCode\KMainCMS\scripts-dev\delete-dead-files.ps1"

$root = "D:\VIbeCode\KMainCMS"
$list = "$root\scripts-dev\dead-files.txt"
$ok = 0; $fail = 0; $gone = 0

Get-Content $list | ForEach-Object {
  $p = Join-Path $root $_
  if (-not (Test-Path $p)) { $gone++; return }
  try {
    Remove-Item $p -Force -Recurse -ErrorAction Stop
    $ok++
  } catch {
    $fail++
    Write-Host "FAILED: $p" -ForegroundColor Red
  }
}

# Also remove empty dirs left behind under the pruned trees
foreach ($dir in @("$root\backend", "$root\frontend\src")) {
  Get-ChildItem $dir -Directory -Recurse |
    Sort-Object { $_.FullName.Length } -Descending |
    ForEach-Object {
      if (-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
      }
    }
}

Write-Host "`nDeleted: $ok | Already gone: $gone | Failed: $fail"
