$baseUrl = "http://localhost:5052/api"
$passwords = @("admin", "123456", "Admin@123", "password")
$token = $null

foreach ($pass in $passwords) {
    try {
        $creds = @{ username = "admin"; password = $pass }
        Write-Host "Trying login with pass: $pass"
        $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body ($creds | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        $token = $login.data.token 
        if (-not $token) { $token = $login.token }
        Write-Host "Login successful!"
        break
    } catch {
        Write-Host "Failed."
    }
}

if (-not $token) {
    Write-Host "Could not login. Skipping test."
    exit
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Sending Check-out request..."
try {
    # Send empty body for checkout
    Invoke-RestMethod -Uri "$baseUrl/attendance/check-out" -Method Post -Body "{}" -ContentType "application/json" -Headers $headers
    Write-Host "Checkout succeeded (Unexpected if < 15min)."
} catch {
    $response = $_.Exception.Response
    if ($response) {
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Checkout Failed with Status: $($response.StatusCode)"
        Write-Host "Response Body: '$body'"
        
        if ([string]::IsNullOrWhiteSpace($body)) {
            Write-Host "⚠️ ALERT: Body is empty!"
        } else {
             Write-Host "✅ Body matches expectations?"
        }
    } else {
        Write-Host "Request failed without response: $($_.Exception.Message)"
    }
}
