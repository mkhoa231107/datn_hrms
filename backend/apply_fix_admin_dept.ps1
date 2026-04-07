$Server   = "localhost\SQLEXPRESS"
$Database = "HRMS_DATN"
$SqlFile  = "c:\Users\Acer\OneDrive\文档\datn_3-main\backend\fix_admin_dept.sql"

$conn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;")
$conn.Open()

$sql = Get-Content $SqlFile -Raw -Encoding UTF8
# Split by GO (simple split)
$batches = $sql -split "(?m)^\s*GO\s*$"

foreach ($batch in $batches) {
    if ([string]::IsNullOrWhiteSpace($batch)) { continue }
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $batch
    try {
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Success executing batch."
    } catch {
        Write-Error "Error executing batch: $($_.Exception.Message)"
    }
    $cmd.Dispose()
}

$conn.Close()
Write-Host "✅ Done."
