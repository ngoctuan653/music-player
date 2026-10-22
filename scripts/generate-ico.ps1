Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\icon.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngBuffers = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBuffers += ,@($sz, $ms.ToArray())
    $g.Dispose()
    $bmp.Dispose()
    $ms.Dispose()
}
$src.Dispose()

# Create ICO structure
$icoMs = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoMs)

# ICONDIR
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type (1=ICO)
$bw.Write([UInt16]$sizes.Count) # Count

$offset = 6 + ($sizes.Count * 16)

foreach ($item in $pngBuffers) {
    $sz = $item[0]
    $data = $item[1]
    
    $w = if ($sz -ge 256) { 0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { 0 } else { [byte]$sz }
    
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0) # Colors
    $bw.Write([byte]0) # Reserved
    $bw.Write([UInt16]1) # Planes
    $bw.Write([UInt16]32) # BitCount
    $bw.Write([UInt32]$data.Length) # BytesInRes
    $bw.Write([UInt32]$offset) # ImageOffset
    
    $offset += $data.Length
}

foreach ($item in $pngBuffers) {
    $data = $item[1]
    $bw.Write($data)
}

$buildDir = Join-Path $PSScriptRoot "..\build"
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$buildIco = Join-Path $buildDir "icon.ico"
$publicIco = Join-Path $PSScriptRoot "..\public\icon.ico"

[System.IO.File]::WriteAllBytes($buildIco, $icoMs.ToArray())
[System.IO.File]::WriteAllBytes($publicIco, $icoMs.ToArray())

$bw.Dispose()
$icoMs.Dispose()

Write-Output "Successfully generated: $buildIco and $publicIco"
