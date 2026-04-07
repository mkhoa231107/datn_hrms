$ErrorActionPreference = "Stop"
$BrainDir = "C:\Users\Acer\.gemini\antigravity\brain\eb031b26-7356-4b6a-b485-255851f1cf31"
$AvatarsDir = "C:\Users\Acer\OneDrive\文档\datn_3-main\backend\HRMS.API\wwwroot\uploads\avatars"

if (!(Test-Path $AvatarsDir)) {
    New-Item -ItemType Directory -Force -Path $AvatarsDir | Out-Null
}

# The user uploaded a face picture recently. It's a .jpg file. Let's get the latest one.
$LatestJpg = Get-ChildItem -Path $BrainDir -Filter "*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($LatestJpg) {
    try {
        $TargetFileName = "hr_rec_04_" + $LatestJpg.BaseName + ".jpg"
        $TargetPath = Join-Path $AvatarsDir $TargetFileName
        Copy-Item $LatestJpg.FullName -Destination $TargetPath -Force
        
        $DbServer = "localhost\SQLEXPRESS"
        $DbName = "HRMS_DATN"
        $AvatarUrl = "/uploads/avatars/$TargetFileName"
        
        $sqlCommand = "UPDATE Employees SET Avatar = '$AvatarUrl' WHERE EmployeeCode = 'HR-REC-04';"
        
        $connString = "Server=$DbServer;Database=$DbName;Integrated Security=True;TrustServerCertificate=True"
        $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sqlCommand
        $rows = $cmd.ExecuteNonQuery()
        $conn.Close()
        
        Write-Host "SUCCESS: Profile picture applied ($rows rows updated). Path: $AvatarUrl"
    } catch {
        Write-Host "FAILED: $_"
    }
} else {
    Write-Host "FAILED: Could not find the uploaded .jpg image."
}
