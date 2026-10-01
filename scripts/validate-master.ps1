$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $repositoryRoot = (Get-Location).Path
}
else {
    $repositoryRoot = Split-Path -Parent $PSScriptRoot
}

function Read-JsonFile {
    param([string]$RelativePath)

    $path = Join-Path $repositoryRoot $RelativePath
    if (-not (Test-Path $path)) {
        throw "Required file not found: $RelativePath"
    }

    $json = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    try {
        return ConvertFrom-Json -InputObject $json
    }
    catch {
        throw "Invalid JSON in ${RelativePath}: $($_.Exception.Message)"
    }
}

function Assert-UniqueIds {
    param(
        [object[]]$Items,
        [string]$Description
    )

    $ids = @($Items | ForEach-Object { $_.id })
    if (($ids | Select-Object -Unique).Count -ne $ids.Count) {
        throw "Duplicate IDs in $Description"
    }
}

$master = Read-JsonFile 'data/master/characters.json'
$equipmentMaster = Read-JsonFile 'data/master/equipment-types.json'
$settings = Read-JsonFile 'data/master/settings.json'
$null = Read-JsonFile 'schemas/character-master.schema.json'

if ($master.schemaVersion -ne 1 -or $equipmentMaster.schemaVersion -ne 1 -or $settings.schemaVersion -ne 1) {
    throw 'Unsupported master schema version'
}

if ([string]::IsNullOrWhiteSpace($master.region) -or [string]::IsNullOrWhiteSpace($master.locale)) {
    throw 'Master region and locale are required'
}

if ($settings.maxSenseiLevel -lt 1 -or $settings.maxCharacterStarGrade -ne 5) {
    throw 'Invalid global level or rarity settings'
}

Assert-UniqueIds @($equipmentMaster.equipmentTypes) 'equipment types'
Assert-UniqueIds @($master.characters) 'characters'

$equipmentTypeIds = @($equipmentMaster.equipmentTypes | ForEach-Object { $_.id })
$characterIds = @($master.characters | ForEach-Object { $_.id })
if ($characterIds.Count -eq 0) {
    throw 'Character master must contain at least one prototype character'
}

foreach ($character in $master.characters) {
    if ($character.initialStarGrade -lt 1 -or $character.initialStarGrade -gt 3) {
        throw "Invalid initial rarity for $($character.id)"
    }

    if (@($character.wbAttributes).Count -ne 3) {
        throw "Expected three WB attributes for $($character.id)"
    }
    Assert-UniqueIds @($character.wbAttributes) "WB attributes for $($character.id)"
    if (@($character.wbAttributes | Where-Object { $_.maxLevel -ne 25 }).Count -gt 0) {
        throw "WB attributes must have maxLevel 25 for $($character.id)"
    }

    if (@($character.equipmentSlots).Count -ne 3) {
        throw "Expected three equipment slots for $($character.id)"
    }
    Assert-UniqueIds @($character.equipmentSlots) "equipment slots for $($character.id)"
    foreach ($slot in $character.equipmentSlots) {
        if ($slot.equipmentTypeId -notin $equipmentTypeIds) {
            throw "Unknown equipment type '$($slot.equipmentTypeId)' for $($character.id)"
        }
        if ($slot.unlockedAtLevel -notin $settings.equipmentSlotUnlockLevels) {
            throw "Unexpected equipment unlock level '$($slot.unlockedAtLevel)' for $($character.id)"
        }
    }
    if ((@($character.equipmentSlots | ForEach-Object { $_.unlockedAtLevel } | Sort-Object) -join ',') -ne (@($settings.equipmentSlotUnlockLevels | Sort-Object) -join ',')) {
        throw "Equipment unlock levels do not match settings for $($character.id)"
    }

    Assert-UniqueIds @($character.skills) "skills for $($character.id)"
    foreach ($skill in $character.skills) {
        if ($skill.type -notin @('ex', 'normal', 'passive', 'sub') -or $skill.maxLevel -lt 1) {
            throw "Invalid skill definition '$($skill.id)' for $($character.id)"
        }
    }

    if ($character.favoriteItem -and $character.favoriteItem.maxTier -ne 2) {
        throw "Favorite item maxTier must be 2 for $($character.id)"
    }
}

Write-Output "Master data valid: $($master.characters.Count) character(s), $($equipmentMaster.equipmentTypes.Count) equipment types"