param(
   [string]$source,
   [string]$destination
)

Write-Host "Source: $source"
Write-Host "Destination: $destination"

Write-Host "TFS Server: $env:SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"

$teamExplorerPath = 'C:\Program Files (x86)\Microsoft Visual Studio\2017\*\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\'

Get-ChildItem -Path ($teamExplorerPath + "*") -Filter *.dll -File | ForEach-Object {
    try { [void][System.Reflection.Assembly]::LoadFrom($_.FullName) } catch { }
}

$credentials = New-Object Microsoft.TeamFoundation.Client.TfsClientCredentials -ArgumentList @((New-Object Microsoft.TeamFoundation.Client.WindowsCredential), $false)

$collection = New-Object Microsoft.TeamFoundation.Client.TfsTeamProjectCollection -ArgumentList @($env:SYSTEM_TEAMFOUNDATIONCOLLECTIONURI, $credentials)

$sourceControl = [Microsoft.TeamFoundation.VersionControl.Client.VersionControlServer]$collection.GetService([Microsoft.TeamFoundation.VersionControl.Client.VersionControlServer])

$changeset = $env:BUILD_SOURCEVERSION

if ($changeset.StartsWith("C")) {
    $changeset = $changeset.Substring(1)
}

$versionSpec = New-Object Microsoft.TeamFoundation.VersionControl.Client.ChangesetVersionSpec -ArgumentList $changeset

if ([IO.Path]::IsPathRooted($destination)) {
    $qualifiedDestination = $destination
}
else {
    $qualifiedDestination = Join-Path $env:Build_SourcesDirectory $destination
}

Write-Host "Qualified Destination: $qualifiedDestination"

$sourceItem = $sourceControl.GetItem($source, $versionSpec)
$sourceItemType = $sourceItem.ItemType

Write-Host $sourceItem

$recursionType = [Microsoft.TeamFoundation.VersionControl.Client.RecursionType]::None
if ($sourceItemType -ieq 'folder') {
    $recursionType = [Microsoft.TeamFoundation.VersionControl.Client.RecursionType]::Full
    
}

$itemSet = $sourceControl.GetItems($source, $versionSpec, $recursionType)

$itemSet.Items | ForEach-Object {
    $item = $_
    $itemServerItem = $item.ServerItem

    $itemDestination = $item.ServerItem.Replace($source, $qualifiedDestination)

    if ($item.ItemType -ieq 'folder') {
        [IO.Directory]::CreateDirectory($itemDestination) | Out-Null
    }
    elseif ($item.ItemType -ieq 'file') {
        Write-Host "Getting $itemServerItem"

        $parentDirectory = [IO.Path]::GetDirectoryName($itemDestination)

        [IO.Directory]::CreateDirectory($parentDirectory) | Out-Null

        $sourceControl. DownloadFile($item.ServerItem, $itemDestination)
    }
}