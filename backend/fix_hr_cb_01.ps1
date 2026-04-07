# fix_hr_cb_01.ps1
$Server = "localhost\SQLEXPRESS"
$Database = "HRMS_DATN"
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;")
$conn.Open()

function Exec-NonQuery($sql, $params = @{}) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($k in $params.Keys) { $v = $params[$k]; if ($v -is [string]) { $cmd.Parameters.Add($k, [System.Data.SqlDbType]::NVarChar).Value = $v } else { $cmd.Parameters.AddWithValue($k, $v) | Out-Null } }
    $cmd.ExecuteNonQuery() | Out-Null; $cmd.Dispose()
}

function Exec-Scalar($sql, $params = @{}) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($k in $params.Keys) { $v = $params[$k]; if ($v -is [string]) { $cmd.Parameters.Add($k, [System.Data.SqlDbType]::NVarChar).Value = $v } else { $cmd.Parameters.AddWithValue($k, $v) | Out-Null } }
    $r = $cmd.ExecuteScalar(); $cmd.Dispose(); return $r
}

Write-Host "--- FIXING HR-CB-01 (HEX ENCODING) ---"

# Step 1: Cleanup any existing HR-CB-01
$oldId = Exec-Scalar "SELECT Id FROM Employees WHERE EmployeeCode = 'HR-CB-01'"
if ($oldId) {
    Write-Host "  Removing existing HR-CB-01 (ID: $oldId)"
    Exec-NonQuery "UPDATE Departments SET ManagerId = NULL WHERE ManagerId = @oid" @{oid=$oldId}
    Exec-NonQuery "DELETE FROM Employees WHERE Id = @oid" @{oid=$oldId}
}

# Step 2: Shift IDs 19 and above
$maxId = Exec-Scalar "SELECT MAX(Id) FROM Employees"
if ($maxId -ge 19) {
    Write-Host "  Shifting IDs >= 19 to make room..."
    
    $sqlShift = @"
    -- Disable all constraints for the session
    EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Identify all tables with EmployeeId
        DECLARE @Tables TABLE (TableName NVARCHAR(256), SchemaName NVARCHAR(256));
        INSERT INTO @Tables
        SELECT t.name, s.name FROM sys.tables t JOIN sys.columns c ON t.object_id = c.object_id JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE c.name = 'EmployeeId' AND t.name != 'Employees' AND t.type = 'U';

        -- 2. Update child tables
        DECLARE @tn NVARCHAR(256), @sn NVARCHAR(256), @sql NVARCHAR(MAX);
        DECLARE tbCur CURSOR FOR SELECT TableName, SchemaName FROM @Tables;
        OPEN tbCur; FETCH NEXT FROM tbCur INTO @tn, @sn;
        WHILE @@FETCH_STATUS = 0 BEGIN
            SET @sql = 'UPDATE [' + @sn + '].[' + @tn + '] SET EmployeeId = EmployeeId + 1 WHERE EmployeeId >= 19';
            EXEC sp_executesql @sql;
            FETCH NEXT FROM tbCur INTO @tn, @sn;
        END
        CLOSE tbCur; DEALLOCATE tbCur;

        -- 3. Update ManagerId in Departments
        UPDATE Departments SET ManagerId = ManagerId + 1 WHERE ManagerId >= 19;

        -- 4. Shift Employees table IDs
        IF EXISTS (SELECT 1 FROM Employees WHERE Id >= 19)
        BEGIN
            SELECT CAST(Id AS INT) AS Id, EmployeeCode, FullName, DateOfBirth, Gender, Email, PersonalEmail, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt 
            INTO #TempEmps FROM Employees WHERE Id >= 19;
            
            DELETE FROM Employees WHERE Id >= 19;
            
            SET IDENTITY_INSERT Employees ON;
            INSERT INTO Employees (Id, EmployeeCode, FullName, DateOfBirth, Gender, Email, PersonalEmail, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
            SELECT Id + 1, EmployeeCode, FullName, DateOfBirth, Gender, Email, PersonalEmail, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt FROM #TempEmps;
            SET IDENTITY_INSERT Employees OFF;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH

    -- Re-enable all constraints
    EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'
"@
    Exec-NonQuery $sqlShift
}

# Step 3: Insert HR-CB-01 at ID 19
# 'Lê Thị Thảo'
$cn = 'L' + [char]0x00EA + ' Th' + [char]0x1ECB + ' Th' + [char]0x1EA3 + 'o'
# 'Hà Nội'
$adr = 'H' + [char]0x00E0 + ' N' + [char]0x1ED9 + 'i'
# 'Nữ'
$sex = 'N' + [char]0x1EEF
$ce = "thaolt@techvn.com"; $cd = "1990-05-12"

$orgId = Exec-Scalar "SELECT Id FROM Organizations WHERE OrganizationCode = 'TECHVN'"
$cbDeptId = Exec-Scalar "SELECT Id FROM Departments WHERE DepartmentCode = 'HR-CB'"
$cbHeadPosId = Exec-Scalar "SELECT Id FROM Positions WHERE PositionCode = 'HR-CB-HEAD'"
$uId = Exec-Scalar "SELECT Id FROM Users WHERE Username = 'hr_cb_01'"

if (!$uId) {
    $ph = '$2a$11$q9h6qV3W6R7vYV7X8Pq7O.6rFp5Vv.g7B0M4p5k6p5u.6rFp5Vv.'
    Exec-NonQuery "INSERT INTO Users(Username,PasswordHash,Email,FullName,IsActive,CreatedAt) VALUES('hr_cb_01', @ph, 'hr_cb_01@techvn.com', @fn, 1, GETUTCDATE())" @{ph=$ph;fn=$cn}
    $uId = Exec-Scalar "SELECT Id FROM Users WHERE Username = 'hr_cb_01'"
}

$dhId = Exec-Scalar "SELECT Id FROM Roles WHERE RoleName = 'DepartmentHead'"
if ($uId -and -not (Exec-Scalar "SELECT 1 FROM UserRoles WHERE UserId=@uid" @{uid=$uId})) { 
    Exec-NonQuery "INSERT INTO UserRoles(UserId,RoleId,AssignedAt,CreatedAt) VALUES(@uid,@rid,GETUTCDATE(),GETUTCDATE())" @{uid=$uId;rid=$dhId} 
}

if ($uId) {
    Write-Host "  Finalizing HR-CB-01 at ID 19..."
    Exec-NonQuery @"
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(Id,EmployeeCode,FullName,DateOfBirth,Gender,IdentityNumber,IdentityDate,IdentityPlace,Email,PersonalEmail,Phone,Address,JoinDate,Status,OrganizationId,DepartmentId,PositionId,UserId,CreatedAt)
VALUES(19,'HR-CB-01',@fn,@dob,@sex,'001090012345','2015-05-12',N'Cục Cảnh sát QLHC về TTXH','hr_cb_01@techvn.com',@pem,'0912345678',@adr,GETUTCDATE(),1,@oid,@did,@posId,@uid,GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;
UPDATE Departments SET ManagerId = 19 WHERE Id = @did;
"@ @{fn=$cn;dob=$cd;sex=$sex;pem=$ce;adr=$adr;oid=$orgId;did=$cbDeptId;posId=$cbHeadPosId;uid=$uId}
}

# Fix Minh Khoa (ID 18) if needed
$kn = [char]0x0110 + [char]0x1EB7 + 'ng Ph' + [char]0x1EA1 + 'm Minh Khoa'
Exec-NonQuery "UPDATE Employees SET FullName=@fn, Gender=N'Nam', Address=@adr WHERE Id=18" @{fn=$kn;adr=$adr}

$conn.Close()
Write-Host "--- ALL DONE ---"
