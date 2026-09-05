[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$Copy
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$skillsSource = Join-Path $repositoryRoot 'personal-skills'
$userProfilePath = [Environment]::GetFolderPath('UserProfile')
$skillsInstallRoot = Join-Path $userProfilePath '.agents\skills'

if (-not (Test-Path -LiteralPath $skillsSource -PathType Container)) {
    throw "Personal skills directory not found: $skillsSource"
}

if ($PSCmdlet.ShouldProcess($skillsInstallRoot, 'Create Codex user skills directory')) {
    New-Item -ItemType Directory -Force -Path $skillsInstallRoot | Out-Null
}

$skillDirectories = Get-ChildItem -LiteralPath $skillsSource -Directory | Where-Object {
    Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf
}

foreach ($skillDirectory in $skillDirectories) {
    $destination = Join-Path $skillsInstallRoot $skillDirectory.Name

    if (Test-Path -LiteralPath $destination) {
        $existingItem = Get-Item -LiteralPath $destination -Force
        $existingTarget = @($existingItem.Target) | Select-Object -First 1
        if (($existingItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -and
            $existingTarget -and
            ((Resolve-Path -LiteralPath $existingTarget).Path -eq $skillDirectory.FullName)) {
            Write-Host "Already linked: $($skillDirectory.Name)"
            continue
        }

        throw "Refusing to replace existing skill path: $destination"
    }

    if ($Copy) {
        if ($PSCmdlet.ShouldProcess($destination, "Copy $($skillDirectory.Name)")) {
            Copy-Item -LiteralPath $skillDirectory.FullName -Destination $destination -Recurse
            Write-Host "Copied: $($skillDirectory.Name)"
        }
    }
    elseif ($PSCmdlet.ShouldProcess($destination, "Link $($skillDirectory.Name)")) {
        New-Item -ItemType Junction -Path $destination -Target $skillDirectory.FullName | Out-Null
        Write-Host "Linked: $($skillDirectory.Name)"
    }
}

if (-not $skillDirectories) {
    Write-Warning "No skill folders containing SKILL.md were found in $skillsSource"
}
