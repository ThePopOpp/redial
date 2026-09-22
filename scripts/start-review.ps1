param([ValidateRange(1024, 65535)][int]$Port = 4317)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nextPath = Join-Path $projectRoot 'node_modules\next\dist\bin\next'
$buildPath = Join-Path $projectRoot '.next\BUILD_ID'
if (-not (Test-Path -LiteralPath $buildPath)) { throw 'Run npm run build before starting the review server.' }
$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $probe.Start() } catch { throw "Port $Port is already in use. No existing process was changed. Choose another port with -Port." } finally { $probe.Stop() }
$localDirectory = Join-Path $projectRoot '.redial'
New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
$nodePath = (Get-Command node -ErrorAction Stop).Source
$env:NEXT_TELEMETRY_DISABLED = '1'
$process = Start-Process -FilePath $nodePath -ArgumentList @("`"$nextPath`"", 'start', '--hostname', '127.0.0.1', '--port', "$Port") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localDirectory 'server.stdout.log') -RedirectStandardError (Join-Path $localDirectory 'server.stderr.log') -PassThru
$address = "http://127.0.0.1:$Port"
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  if ($process.HasExited) { throw "The review server exited. Read .redial/server.stderr.log for details." }
  try { $response = Invoke-WebRequest -Uri "$address/demo/overview" -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 300 }
}
if (-not $ready) { throw "The process started as PID $($process.Id), but readiness could not be verified. Inspect .redial/server.stderr.log." }
@{ pid = $process.Id; address = $address; startedAt = $process.StartTime.ToUniversalTime().ToString('o'); project = $projectRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localDirectory 'server.json') -Encoding utf8
Write-Output "Redial review is ready at $address/demo/overview (PID $($process.Id))."
