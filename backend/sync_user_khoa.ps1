$connectionString = "Server=localhost\SQLEXPRESS;Database=HRMS_DATN;Integrated Security=True;TrustServerCertificate=True;"
$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$connection.Open()

$transaction = $connection.BeginTransaction()

try {
    $command = $connection.CreateCommand()
    $command.Transaction = $transaction

    # --- 1. XOA CAC USER TU 118 DEN 122 ---
    Write-Host "Dang xu ly cac User tu 118 den 122..."
    
    # Go bo UserId o bang Employees neu co lien ket (Set ve NULL)
    $command.CommandText = "UPDATE Employees SET UserId = NULL WHERE UserId BETWEEN 118 AND 122"
    $command.ExecuteNonQuery()

    # Xoa AuditLogs lien quan
    $command.CommandText = "DELETE FROM AuditLogs WHERE UserId BETWEEN 118 AND 122"
    $command.ExecuteNonQuery()
    
    # Xoa UserRoles lien quan
    $command.CommandText = "DELETE FROM UserRoles WHERE UserId BETWEEN 118 AND 122"
    $command.ExecuteNonQuery()

    # Xoa Users
    $command.CommandText = "DELETE FROM Users WHERE Id BETWEEN 118 AND 122"
    $rowsAffected = $command.ExecuteNonQuery()
    Write-Host "Da xoa User (118-122)."

    # --- 2. XU LY MINH KHOA (123 -> 18) ---
    Write-Host "Dang di chuyen Minh Khoa sang ID 18..."
    
    # Don dep ID 18 neu dang ton tai (De lay cho cho Minh Khoa)
    $command.CommandText = "UPDATE Employees SET UserId = NULL WHERE UserId = 18"
    $command.ExecuteNonQuery()
    $command.CommandText = "DELETE FROM AuditLogs WHERE UserId = 18"
    $command.ExecuteNonQuery()
    $command.CommandText = "DELETE FROM UserRoles WHERE UserId = 18"
    $command.ExecuteNonQuery()
    $command.CommandText = "DELETE FROM Users WHERE Id = 18"
    $command.ExecuteNonQuery()

    # Chen Minh Khoa vao ID 18
    $command.CommandText = "SET IDENTITY_INSERT Users ON; " + 
                           "INSERT INTO Users (Id, Username, PasswordHash, Email, FullName, IsActive, CreatedAt, UpdatedAt) " +
                           "SELECT 18, 'hr_rec_12', PasswordHash, Email, N'Đặng Phạm Minh Khoa', 1, CreatedAt, GETDATE() FROM Users WHERE Id = 123; " +
                           "SET IDENTITY_INSERT Users OFF;"
    $command.ExecuteNonQuery()

    # QUAN TRONG: Chuyen tiep TAI CA o bang Employees tu 123 sang 18 TRUOC KHI XOA 123
    Write-Host "Dang chuyen doi lien ket Employees tu ID 123 sang 18..."
    $command.CommandText = "UPDATE Employees SET UserId = 18 WHERE UserId = 123"
    $command.ExecuteNonQuery()
    
    # Cap nhat not neu Employee ID 18 chua duoc lien ket
    $command.CommandText = "UPDATE Employees SET UserId = 18 WHERE Id = 18"
    $command.ExecuteNonQuery()

    # Chuyen tiep AuditLogs va Roles tu 123 sang 18
    $command.CommandText = "UPDATE AuditLogs SET UserId = 18 WHERE UserId = 123"
    $command.ExecuteNonQuery()
    $command.CommandText = "UPDATE UserRoles SET UserId = 18 WHERE UserId = 123"
    $command.ExecuteNonQuery()

    # Bay gio moi co the xoa ID 123 cu
    $command.CommandText = "DELETE FROM Users WHERE Id = 123"
    $command.ExecuteNonQuery()

    $transaction.Commit()
    Write-Host "-----------------------------"
    Write-Host "--- DONG BO THANH CONG ---"
    Write-Host "User moi: hr_rec_12 (ID 18)"
    Write-Host "Tat ca lien ket da duoc chuyen sang ID 18."
}
catch {
    if ($transaction) { $transaction.Rollback() }
    Write-Error "Loi: $($_.Exception.Message)"
}
finally {
    $connection.Close()
}
