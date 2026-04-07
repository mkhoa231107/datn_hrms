$Email = "khoadeptrai231107@gmail.com"
$Pass = "mk23112007"
try {
    $SMTPClient = New-Object Net.Mail.SmtpClient("smtp.gmail.com", 587)
    $SMTPClient.EnableSsl = $true
    $SMTPClient.Credentials = New-Object System.Net.NetworkCredential($Email, $Pass);
    $SMTPClient.Send($Email, $Email, "Test Connection", "SMTP Test")
    Write-Host "SUCCESS: Connection established and email sent."
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
    if ($_.Exception.InnerException) { Write-Host "INNER: $($_.Exception.InnerException.Message)" }
}
