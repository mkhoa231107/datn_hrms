
$baseUrl = "http://localhost:5052/api/auth/login"
# Testing both potential passwords for admin
$testAccounts = @(
    @{ Username = "admin"; Password = "123456"; RoleName = "Admin" },
    @{ Username = "truongphong1"; Password = "123456"; RoleName = "DepartmentManager" },
    @{ Username = "cnb1"; Password = "123456"; RoleName = "CnbSpecialist" },
    @{ Username = "totruong1"; Password = "123456"; RoleName = "TeamLeader" },
    @{ Username = "nhanvien1"; Password = "123456"; RoleName = "Employee" }
)

$results = @()

foreach ($acc in $testAccounts) {
    $result = [PSCustomObject]@{
        Username = $acc.Username
        TargetRole = $acc.RoleName
        LoginOk = $false
        TokenRole = ""
        Error = ""
    }
    
    try {
        $body = @{ Username = $acc.Username; Password = $acc.Password } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json"
        
        $result.LoginOk = $true
        $result.TokenRole = $response.user.roles -join ', '
    } catch {
        $result.Error = $_.Exception.Message
        if ($_.Exception.Response) {
             $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
             $result.Error += " (" + $reader.ReadToEnd() + ")"
        }
    }
    $results += $result
}

$results | Format-Table -AutoSize
