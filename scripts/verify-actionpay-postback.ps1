param(
  [string]$EncryptedSecretPath = ''
)

$ErrorActionPreference = 'Stop'

$secret = $env:ACTIONPAY_POSTBACK_SECRET
if ([string]::IsNullOrWhiteSpace($secret) -and -not [string]::IsNullOrWhiteSpace($EncryptedSecretPath)) {
  $encrypted = Get-Content -LiteralPath $EncryptedSecretPath -Raw
  $credential = New-Object System.Management.Automation.PSCredential(
    'actionpay',
    (ConvertTo-SecureString $encrypted.Trim())
  )
  $secret = $credential.GetNetworkCredential().Password
}
if ([string]::IsNullOrWhiteSpace($secret)) {
  throw 'ACTIONPAY_POSTBACK_SECRET is unavailable.'
}

$uri = 'https://meuzafi.com.br/api/postbacks/actionpay?status=pending'

try {
  $response = Invoke-WebRequest -Uri $uri -Headers @{ 'X-Zafi-Postback-Token' = $secret } -UseBasicParsing
  $status = [int]$response.StatusCode
} catch {
  if (-not $_.Exception.Response) { throw }
  $status = [int]$_.Exception.Response.StatusCode
}

if ($status -ne 422) {
  throw "Expected authenticated validation status 422, received $status."
}

Write-Output 'Authenticated rejection verified: HTTP 422.'
