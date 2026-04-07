# seed_employee_photos_sql.ps1
# Script to auto-download real-looking face photos and assign to all employees directly in DB

param(
    [string]$DbServer = "localhost\SQLEXPRESS",
    [string]$DbName = "HRMS_DATN"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Employee Photo Seeder (Direct DB)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Define the SQL command
$sqlCommand = @"
-- Update Khoa's photo in Recruitment department (if exists)
UPDATE Employees
SET Avatar = 'https://i.ibb.co/qFmcFz9T/image.png'
WHERE FullName LIKE N'%Khoa%';

-- Update randomly for males who don't have photos
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/men/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Gender LIKE N'%Nam%' OR Gender LIKE N'%Male%') 
  AND (Avatar IS NULL OR Avatar = '')
  AND FullName NOT LIKE N'%Khoa%';

-- Update randomly for females who don't have photos
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/women/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Gender LIKE N'%Nữ%' OR Gender LIKE N'%Female%') 
  AND (Avatar IS NULL OR Avatar = '');

-- Fallback for unspecified genders
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/men/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Avatar IS NULL OR Avatar = '');
"@

Write-Host "`n[1] Executing SQL script on $DbServer ($DbName)..." -ForegroundColor Yellow

try {
    # Use Invoke-Sqlcmd if available, otherwise fallback to sqlcmd.exe
    if (Get-Command Invoke-Sqlcmd -ErrorAction SilentlyContinue) {
        Invoke-Sqlcmd -ServerInstance $DbServer -Database $DbName -Query $sqlCommand -TrustServerCertificate
    } else {
        # Fallback using old sqlcmd utility
        $tempFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value $sqlCommand -Encoding UTF8
        
        $process = Start-Process -FilePath "sqlcmd" -ArgumentList "-S $DbServer -E -d $DbName -i `"$tempFile`" -C" -Wait -NoNewWindow -PassThru
        
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        
        if ($process.ExitCode -ne 0) {
            throw "sqlcmd execution failed with exit code $($process.ExitCode). Please ensure SQL Server is running and accessible."
        }
    }
    Write-Host "    OK - Database updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "    FAILED to execute SQL: $_" -ForegroundColor Red
    Write-Host "    Trying ADO.NET connection as fallback..." -ForegroundColor Yellow
    
    try {
        $connString = "Server=$DbServer;Database=$DbName;Integrated Security=True;TrustServerCertificate=True"
        $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
        $conn.Open()
        
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sqlCommand
        $rowsAffected = $cmd.ExecuteNonQuery()
        
        $conn.Close()
        Write-Host "    OK - ADO.NET updated $rowsAffected rows successfully!" -ForegroundColor Green
    } catch {
        Write-Host "    FAILED fallback: $_" -ForegroundColor Red
        Write-Host "    `nCould not connect to the database. Please run the 'update_avatars_sqlserver.sql' script manually using SSMS." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Done! All missing photos assigned." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNow go to the Face Registration dashboard to bulk-scan all photos." -ForegroundColor Yellow
