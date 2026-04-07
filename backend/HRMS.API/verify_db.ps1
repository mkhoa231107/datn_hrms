$connectionString = "Server=LAPTOP-F899Q8MG\SQLEXPRESS01;Database=HRMS_DB;Integrated Security=SSPI;TrustServerCertificate=True"
$query = "SELECT Id, Username, PasswordHash, IsActive FROM Users WHERE Username LIKE '%totruong%'"

$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$command = New-Object System.Data.SqlClient.SqlCommand($query, $connection)

try {
    $connection.Open()
    $reader = $command.ExecuteReader()

    if ($reader.HasRows) {
        while ($reader.Read()) {
            Write-Host "Found User:"
            Write-Host "Id: " $reader["Id"]
            Write-Host "Username: " $reader["Username"]
            Write-Host "PasswordHash: " $reader["PasswordHash"]
            Write-Host "IsActive: " $reader["IsActive"]
            Write-Host "--------------------"
        }
    } else {
        Write-Host "User 'totruong1' not found!"
    }
} catch {
    Write-Host "Error: " $_.Exception.Message
} finally {
    if ($connection.State -eq 'Open') {
        $connection.Close()
    }
}
