# seed_employee_photos.ps1
# Script to auto-download real-looking face photos and assign to all employees
# Uses randomuser.me API for royalty-free placeholder faces

param(
    [string]$BackendUrl = "http://localhost:5052",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Employee Photo Seeder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Login to get JWT token
Write-Host "`n[1] Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{ Username = $AdminUsername; Password = $AdminPassword } | ConvertTo-Json
try {
    $loginRes = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginRes.token
    Write-Host "    OK - Got JWT token" -ForegroundColor Green
} catch {
    Write-Host "    FAILED to login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $token" }

# Step 2: Get all employees
Write-Host "`n[2] Fetching employee list..." -ForegroundColor Yellow
try {
    $employees = Invoke-RestMethod -Uri "$BackendUrl/api/employees" -Method GET -Headers $headers
    Write-Host "    Found $($employees.Count) employees" -ForegroundColor Green
} catch {
    Write-Host "    FAILED to fetch employees: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get genders if available (to pick matching photos), default to mix
# randomuser.me supports gender param: male/female
$genderMap = @{
    "Nam" = "male"
    "Male" = "male"
    "Nữ" = "female"
    "Female" = "female"
}

Write-Host "`n[3] Downloading and uploading photos..." -ForegroundColor Yellow
$success = 0
$failed = 0

foreach ($emp in $employees) {
    # Skip if already has a photo
    if ($emp.avatar -and $emp.avatar -ne "") {
        Write-Host "    SKIP $($emp.fullName) - Already has photo" -ForegroundColor Gray
        continue
    }

    Write-Host "    Processing: $($emp.fullName) ($($emp.employeeCode))..." -ForegroundColor White -NoNewline

    # Determine gender for photo
    $gender = "male"
    # Try to get employee's gender from profile if available
    try {
        $profile = Invoke-RestMethod -Uri "$BackendUrl/api/employees/$($emp.id)" -Method GET -Headers $headers
        if ($profile.gender -and $genderMap.ContainsKey($profile.gender)) {
            $gender = $genderMap[$profile.gender]
        }
    } catch {
        # Use default gender if profile fetch fails
    }

    try {
        if ($emp.fullName -match "Khoa") {
            # Use specific photo for Khoa
            $photoUrl = "https://i.ibb.co/qFmcFz9T/image.png"
            $photoBytes = (Invoke-WebRequest -Uri $photoUrl -UseBasicParsing).Content
        } else {
            # Fetch a random user photo from randomuser.me (royalty-free)
            $randomUserRes = Invoke-RestMethod -Uri "https://randomuser.me/api/?gender=$gender&inc=picture,name" -Method GET
            $photoUrl = $randomUserRes.results[0].picture.large
            # Download the photo bytes
            $photoBytes = (Invoke-WebRequest -Uri $photoUrl -UseBasicParsing).Content
        }

        # Create multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"photo`"; filename=`"photo_$($emp.id).jpg`"",
            "Content-Type: image/jpeg",
            "",
            [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($photoBytes),
            "--$boundary--"
        ) -join $LF
        $bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($bodyLines)

        $uploadHeaders = @{
            Authorization = "Bearer $token"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        $uploadRes = Invoke-RestMethod -Uri "$BackendUrl/api/employees/$($emp.id)/photo" `
            -Method POST -Body $bodyBytes -Headers $uploadHeaders

        Write-Host " OK (photo saved)" -ForegroundColor Green
        $success++

        # Small delay to be polite to the API
        Start-Sleep -Milliseconds 300

    } catch {
        Write-Host " FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Done! Success: $success | Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNow go to the Face Registration dashboard to bulk-scan all photos." -ForegroundColor Yellow
