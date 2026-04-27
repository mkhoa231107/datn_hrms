
$passwordHash = '$2a$11$wIF9k2V9AJDLS/G0X6IyeeN8h01VooQ.BuypP8DDv3rQmsFk/wjca'

function CreateAccount($username, $fullName, $email, $roleId, $deptId, $posId, $empCode) {
    $sql = @"
    SET QUOTED_IDENTIFIER ON;
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = '$username')
    BEGIN
        INSERT INTO Users (Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
        VALUES ('$username', '$passwordHash', '$email', '$fullName', 1, GETUTCDATE());
        DECLARE @uid INT = SCOPE_IDENTITY();
        INSERT INTO UserRoles (UserId, RoleId, AssignedAt, CreatedAt) VALUES (@uid, $roleId, GETUTCDATE(), GETUTCDATE());
        INSERT INTO Employees (EmployeeCode, FullName, Email, Phone, Address, JoinDate, DateOfBirth, Gender, [Status], IsActive, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt, BasicSalary, Coefficient, NumberOfDependents)
        VALUES ('$empCode', '$fullName', '$email', '0000000000', 'HQ', GETUTCDATE(), '1990-01-01', 'Other', 2, 1, 1, $deptId, $posId, @uid, GETUTCDATE(), 10000000, 1.0, 0);
    END
"@
    sqlcmd -S . -d DATN_HRMS -C -Q $sql
}

# Role IDs: DeptMgr=2, DeptHead=3, Employee=6
# Dept IDs: SALES=1, MKT=2, PRD=3, ADM=4, PRD-ASS=5

Write-Host "Creating Managers and Heads for all departments..."
# 1. SALES
CreateAccount "mgr_sales" "Manager Sales" "mgr_sales@hrms.local" 2 1 1 "MGR_SALES"
CreateAccount "head_sales" "Head Sales" "head_sales@hrms.local" 3 1 1 "HEAD_SALES"

# 2. MKT
CreateAccount "mgr_mkt" "Manager MKT" "mgr_mkt@hrms.local" 2 2 1 "MGR_MKT"
CreateAccount "head_mkt" "Head MKT" "head_mkt@hrms.local" 3 2 1 "HEAD_MKT"

# 3. PRD
CreateAccount "mgr_prd" "Manager PRD" "mgr_prd@hrms.local" 2 3 1 "MGR_PRD"
CreateAccount "head_prd" "Head PRD" "head_prd@hrms.local" 3 3 1 "HEAD_PRD"

# 4. ADM
CreateAccount "mgr_adm" "Manager ADM" "mgr_adm@hrms.local" 2 4 1 "MGR_ADM"
CreateAccount "head_adm" "Head ADM" "head_adm@hrms.local" 3 4 1 "HEAD_ADM"

# 5. PRD-ASS
CreateAccount "mgr_prd_ass" "Manager PRD-ASS" "mgr_prd_ass@hrms.local" 2 5 1 "MGR_PRD_ASS"
CreateAccount "head_prd_ass" "Head PRD-ASS" "head_prd_ass@hrms.local" 3 5 1 "HEAD_PRD_ASS"

Write-Host "Creating 20 employees for SALES, MKT, PRD..."
for ($i=1; $i -le 20; $i++) {
    CreateAccount ("emp_sales_" + $i.ToString("D2")) ("Employee Sales $i") ("sales_$i@hrms.local") 6 1 1 ("SALES_" + $i.ToString("D2"))
    CreateAccount ("emp_mkt_" + $i.ToString("D2")) ("Employee MKT $i") ("mkt_$i@hrms.local") 6 2 1 ("MKT_" + $i.ToString("D2"))
    CreateAccount ("emp_prd_" + $i.ToString("D2")) ("Employee PRD $i") ("prd_$i@hrms.local") 6 3 1 ("PRD_" + $i.ToString("D2"))
}

Write-Host "Done."
