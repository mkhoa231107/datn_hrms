# =============================================================
# seed_subdept_employees.ps1 - RESTORED COMPATIBLE VERSION
# =============================================================
$ErrorActionPreference = "Stop"

# --- CONFIG ---
$Server   = "localhost\SQLEXPRESS"
$Database = "HRMS_DATN"
$PasswordHash = '$2a$11$q9h6qV3W6R7vYV7X8Pq7O.6rFp5Vv.g7B0M4p5k6p5u.6rFp5Vv.'

# Force UTF8 for Console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Connection
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;")
$conn.Open()
Write-Host "Da ket noi den $Database"

function Exec-NonQuery($sql, $params = @{}) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($k in $params.Keys) {
        $v = $params[$k]
        if ($v -is [string]) { $cmd.Parameters.Add($k, [System.Data.SqlDbType]::NVarChar).Value = $v } else { $cmd.Parameters.AddWithValue($k, $v) | Out-Null }
    }
    $cmd.ExecuteNonQuery() | Out-Null; $cmd.Dispose()
}

function Exec-Scalar($sql, $params = @{}) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($k in $params.Keys) {
        $v = $params[$k]
        if ($v -is [string]) { $cmd.Parameters.Add($k, [System.Data.SqlDbType]::NVarChar).Value = $v } else { $cmd.Parameters.AddWithValue($k, $v) | Out-Null }
    }
    $r = $cmd.ExecuteScalar(); $cmd.Dispose(); return $r
}

function Exec-Query($sql, $params = @{}) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($k in $params.Keys) {
        $v = $params[$k]
        if ($v -is [string]) { $cmd.Parameters.Add($k, [System.Data.SqlDbType]::NVarChar).Value = $v } else { $cmd.Parameters.AddWithValue($k, $v) | Out-Null }
    }
    $reader = $cmd.ExecuteReader(); $rows = @(); while ($reader.Read()) {
        $row = @{}; for ($i = 0; $i -lt $reader.FieldCount; $i++) { $row[$reader.GetName($i)] = $reader.GetValue($i) }; $rows += $row
    }
    $reader.Close(); $cmd.Dispose(); return $rows
}

function Mega-Delete($id) {
    if (-not $id) { return }
    $sql = @"
DECLARE @targetId INT = @eid; DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'DELETE FROM [' + SCHEMA_NAME(t.schema_id) + '].[' + t.name + '] WHERE EmployeeId = ' + CAST(@targetId AS NVARCHAR(10)) + ';'
FROM sys.tables t JOIN sys.columns c ON t.object_id = c.object_id WHERE c.name = 'EmployeeId' AND t.name != 'Employees' AND t.type = 'U';
EXEC sp_executesql @sql; UPDATE Departments SET ManagerId = NULL WHERE ManagerId = @targetId; DELETE FROM Employees WHERE Id = @targetId;
"@
    Exec-NonQuery $sql @{eid=$id}
}

# --- 0. MIGRATION ---
Exec-NonQuery "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') AND name = 'PersonalEmail') ALTER TABLE [dbo].[Employees] ADD [PersonalEmail] NVARCHAR(MAX) NULL;"

# --- 1. CLEANUP ---
$kIdExisting = Exec-Scalar "SELECT Id FROM Employees WHERE EmployeeCode IN ('HR-REC-12', 'HR-REC-KHOA')"
if ($kIdExisting -and $kIdExisting -ne 18) { Mega-Delete $kIdExisting }
if (Exec-Scalar "SELECT COUNT(1) FROM Employees WHERE Id=18") { Mega-Delete 18 }
# --- 1b. RESTORE HR-CB-01 AT ID 19 (PUSH DOWN OTHERS) ---
$maxId = Exec-Scalar "SELECT MAX(Id) FROM Employees"
if ($maxId -ge 19) {
    for ($i=$maxId; $i -ge 19; $i--) {
        if (Exec-Scalar "SELECT COUNT(1) FROM Employees WHERE Id=@id" @{id=$i}) { Mega-Delete $i }
    }
}

# --- 2. UNICODE NAME POOLS (RESTORED HEX CODES) ---
$ln1 = 'Nguy' + [char]0x1EC5 + 'n'; $ln2 = 'Tr' + [char]0x1EA7 + 'n'; $ln3 = 'L' + [char]0x00EA; $ln4 = 'Ph' + [char]0x1EA1 + 'm'; $ln5 = 'Ho' + [char]0x00E0 + 'ng';
$lnArr = @($ln1, $ln2, $ln3, $ln4, $ln5, 'Phan', ('V' + [char]0x0169), ('V' + [char]0x00F5), ([char]0x0110 + [char]0x1EB7 + 'ng'), ('B' + [char]0x00F9 + 'i'))

$mn1 = 'Th' + [char]0x1ECB; $mn2 = 'V' + [char]0x0103 + 'n'; $mn3 = [char]0x0110 + [char]0x1EE9 + 'c'; $mn4 = 'Th' + [char]0x1EBF; $mn5 = 'Ng' + [char]0x1ECD + 'c';
$mnArr = @($mn1, $mn2, $mn3, $mn4, 'Anh', $mn5, 'Thanh', 'Minh', 'Thu', ('H' + [char]0x1EA3 + 'i'))

$fn1 = 'H' + [char]0x1ED3 + 'ng'; $fn2 = 'D' + [char]0x0169 + 'ng'; $fn3 = 'Tu' + [char]0x1EA5 + 'n'; $fn4 = 'H' + [char]0x1EA1 + 'nh'; $fn5 = 'C' + [char]0x01B0 + [char]0x1EDD + 'ng';
$fn6 = 'Ki' + [char]0x00EA + 'n'; $fn7 = 'Y' + [char]0x00EA + 'n'; $fn8 = 'B' + [char]0x00EC + 'nh'; $fn9 = 'S' + [char]0x01A1 + 'n'; $fn10 = 'T' + [char]0x00E2 + 'm';
$fnArr = @('Hoa', 'Lan', $fn1, $fn2, $fn3, 'Linh', $fn4, $fn5, 'Trang', $fn6, $fn7, $fn8, 'Mai', $fn9, $fn10)

function Remove-Diacritics($txt) {
    if ([string]::IsNullOrWhiteSpace($txt)) { return "" }
    $s = [string]$txt; $n = $s.Normalize([System.Text.NormalizationForm]::FormD); $sb = New-Object System.Text.StringBuilder
    foreach ($c in $n.ToCharArray()) { if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) { $sb.Append($c) | Out-Null } }
    $r = $sb.ToString().Normalize([System.Text.NormalizationForm]::FormC).ToLower(); return $r -replace ([char]0x0111),"d"
}

function Get-PEmail($fn, $ln, $mn, $dob) {
    $full = "$ln $mn $fn"; $w = $full.Trim().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
    $name = Remove-Diacritics $w[-1]; $init = ""
    for ($i=0; $i -lt ($w.Count -1); $i++) { $init += (Remove-Diacritics $w[$i][0]) }
    return $name + $init + ([DateTime]$dob).ToString("ddMM") + "@gmail.com"
}

# --- 3. SEED ---
$empRoleId = Exec-Scalar "SELECT Id FROM Roles WHERE RoleName = 'Employee'"; $orgId = Exec-Scalar "SELECT Id FROM Organizations WHERE OrganizationCode = 'TECHVN'"; $rand = New-Object System.Random
$depts = Exec-Query "SELECT Id, DepartmentCode, DepartmentName FROM Departments WHERE ParentDepartmentId IS NOT NULL"
foreach ($dept in $depts) {
    $did = $dept["Id"]; $dcode = $dept["DepartmentCode"]; $dname = $dept["DepartmentName"]; if (!$dcode) { continue }
    Write-Host "`n=== Bo phan: $dname ($dcode) ==="
    $posId = Exec-Scalar "SELECT Id FROM Positions WHERE PositionCode = @c" @{c="$dcode-EMP"}
    $emps = Exec-Query "SELECT Id, EmployeeCode FROM Employees WHERE EmployeeCode LIKE @p" @{p="$dcode-%"}
    
    foreach ($emp in $emps) {
        $eid = $emp["Id"]; if ($eid -eq 18) { continue }
        $dob = Exec-Scalar "SELECT DateOfBirth FROM Employees WHERE Id=@id" @{id=$eid}
        if (!$dob -or $dob -is [System.DBNull]) { $dob = (Get-Date "1995-01-01") }
        $ln = $lnArr[$rand.Next($lnArr.Count)]; $mn = $mnArr[$rand.Next($mnArr.Count)]; $fn = $fnArr[$rand.Next($fnArr.Count)]
        $fullName = "$ln $mn $fn"; $pem = Get-PEmail $fn $ln $mn $dob
        Exec-NonQuery "UPDATE Employees SET FullName=@fn, PersonalEmail=@pem, DateOfBirth=@dob WHERE Id=@id" @{fn=$fullName;pem=$pem;dob=$dob;id=$eid}
        $uid = Exec-Scalar "SELECT UserId FROM Employees WHERE Id=@id" @{id=$eid}
        if ($uid) { Exec-NonQuery "UPDATE Users SET FullName=@fn WHERE Id=@uid" @{fn=$fullName;uid=$uid} }
        Write-Host "  [UPDATE] $($emp['EmployeeCode']) | $fullName"
    }
    if ($dcode -eq "HR-REC") {
        # 'Đặng Phạm Minh Khoa' using safe hex codes
        $kn = [char]0x0110 + [char]0x1EB7 + 'ng Ph' + [char]0x1EA1 + 'm Minh Khoa'; 
        $ke = "khoadeptrai231107@gmail.com"; $kd = "2007-11-23"
        if (-not (Exec-Scalar "SELECT Id FROM Employees WHERE Id=18")) {
            $uId = Exec-Scalar "SELECT Id FROM Users WHERE Username='khoadeptrai'"
            if (!$uId) {
                Exec-NonQuery "INSERT INTO Users(Username,PasswordHash,Email,FullName,IsActive,CreatedAt) VALUES('khoadeptrai',@ph,'khoa@techvn.com',@fn,1,GETUTCDATE())" @{ph=$PasswordHash;fn=$kn}
                $uId = Exec-Scalar "SELECT Id FROM Users WHERE Username='khoadeptrai'"
            }
            if (-not (Exec-Scalar "SELECT 1 FROM UserRoles WHERE UserId=@uid" @{uid=$uId})) { Exec-NonQuery "INSERT INTO UserRoles(UserId,RoleId,AssignedAt,CreatedAt) VALUES(@uid,@rid,GETUTCDATE(),GETUTCDATE())" @{uid=$uId;rid=$empRoleId} }
            Exec-NonQuery @"
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(Id,EmployeeCode,FullName,DateOfBirth,Gender,Email,PersonalEmail,Phone,Address,JoinDate,Status,OrganizationId,DepartmentId,PositionId,UserId,CreatedAt)
VALUES(18,'HR-REC-12',@fn,@dob,N'Nam','khoa@techvn.com',@pem,'09231107',N'Ha Noi',GETUTCDATE(),1,@oid,@did,@posId,@uid,GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;
"@ @{fn=$kn;dob=$kd;pem=$ke;oid=$orgId;did=$did;posId=$posId;uid=$uId}
            Write-Host "  [CREATE] ID 18 | HR-REC-12 | $kn"
        }
    }

    if ($dcode -eq "HR-CB") {
        # Restore HR-CB-01 at ID 19
        $cn = 'Lê Thị Thảo'; $ce = "thaolt@techvn.com"; $cd = "1990-05-12"
        if (-not (Exec-Scalar "SELECT Id FROM Employees WHERE Id=19")) {
            $uId = Exec-Scalar "SELECT Id FROM Users WHERE Username='hr_cb_01'"
            if (!$uId) {
                Exec-NonQuery "INSERT INTO Users(Username,PasswordHash,Email,FullName,IsActive,CreatedAt) VALUES('hr_cb_01',@ph,'hr_cb_01@techvn.com',@fn,1,GETUTCDATE())" @{ph=$PasswordHash;fn=$cn}
                $uId = Exec-Scalar "SELECT Id FROM Users WHERE Username='hr_cb_01'"
            }
            $dhId = Exec-Scalar "SELECT Id FROM Roles WHERE RoleName = 'DepartmentHead'"
            if (-not (Exec-Scalar "SELECT 1 FROM UserRoles WHERE UserId=@uid" @{uid=$uId})) { Exec-NonQuery "INSERT INTO UserRoles(UserId,RoleId,AssignedAt,CreatedAt) VALUES(@uid,@rid,GETUTCDATE(),GETUTCDATE())" @{uid=$uId;rid=$dhId} }
            $headPosId = Exec-Scalar "SELECT Id FROM Positions WHERE PositionCode = 'HR-CB-HEAD'"
            Exec-NonQuery @"
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(Id,EmployeeCode,FullName,DateOfBirth,Gender,IdentityNumber,IdentityDate,IdentityPlace,Email,PersonalEmail,Phone,Address,JoinDate,Status,OrganizationId,DepartmentId,PositionId,UserId,CreatedAt)
VALUES(19,'HR-CB-01',@fn,@dob,N'Nữ','001090012345','2015-05-12',N'Cục Cảnh sát QLHC về TTXH','hr_cb_01@techvn.com',@pem,'0912345678',N'Hà Nội',GETUTCDATE(),1,@oid,@did,@posId,@uid,GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;
UPDATE Departments SET ManagerId = 19 WHERE Id = @did;
"@ @{fn=$cn;dob=$cd;pem=$ce;oid=$orgId;did=$did;posId=$headPosId;uid=$uId}
            Write-Host "  [CREATE] ID 19 | HR-CB-01 | $cn"
        }
    }
}
$conn.Close(); Write-Host "`n=== SUCCESS ==="
