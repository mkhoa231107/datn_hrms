$connectionString = "Server=localhost\SQLEXPRESS;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True"
$query = @"
UPDATE Users SET FullName = N'Đặng Phạm Minh Khoa' WHERE Id = 18;
UPDATE Employees SET FullName = N'Đặng Phạm Minh Khoa', PersonalEmail = 'khoadeptrai231107@gmail.com' WHERE UserId = 18;
"@

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = $query
    $rowsAffected = $command.ExecuteNonQuery()
    $connection.Close()
    Write-Host "SUCCESS: Updated $rowsAffected rows with Unicode names." -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
