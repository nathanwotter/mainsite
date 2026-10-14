[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$modulePath = Join-Path $PSScriptRoot 'SpamClassifier.psm1'
$casesPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'tests\spam-regression-cases.json'

Import-Module $modulePath -Force
$cases = Get-Content -Raw -LiteralPath $casesPath | ConvertFrom-Json
$failures = @()

foreach ($case in $cases) {
    $actual = Get-WeeklyDigestSpamDecision -Message $case
    if ($actual.decision -ne $case.expected_decision) {
        $failures += "{0}: expected {1}, got {2} (score {3})" -f $case.name, $case.expected_decision, $actual.decision, $actual.score
    }
    else {
        Write-Host "PASS $($case.name): $($actual.decision) (score $($actual.score))"
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "All $($cases.Count) spam-classifier regression cases passed."
