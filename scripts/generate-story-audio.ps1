$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectRoot = Split-Path -Parent $PSScriptRoot
$scratchPath = Join-Path $projectRoot '.redial/audio-source'
$outputPath = Join-Path $projectRoot 'public/audio'
New-Item -ItemType Directory -Force -Path $scratchPath,$outputPath | Out-Null
$turns = @(
  @{speaker='agent';label='Redial';voice='Microsoft Zira Desktop';text="Hi, you've reached Alex's AI assistant. May I ask who's calling and what it's about?"},
  @{speaker='caller';label='Jordan';voice='Microsoft David Desktop';text="Hi, this is Jordan with a delivery for Alex. Would tomorrow morning work?"},
  @{speaker='agent';label='Redial';voice='Microsoft Zira Desktop';text="Thanks, Jordan. What time tomorrow, and do you need someone there to sign?"},
  @{speaker='caller';label='Jordan';voice='Microsoft David Desktop';text="Around ten. A signature would be great, but I can check with reception."},
  @{speaker='agent';label='Redial';voice='Microsoft Zira Desktop';text="Got it. I'll make sure Alex has the details."}
)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
$pcm = New-Object System.IO.MemoryStream
$cues = @()
try {
  $synth.Rate = 0
  for ($index=0; $index -lt $turns.Count; $index++) {
    $turn = $turns[$index]
    $clipPath = Join-Path $scratchPath "turn-$index.wav"
    $synth.SelectVoice($turn.voice)
    $synth.SetOutputToWaveFile($clipPath,$format)
    $synth.Speak($turn.text)
    $synth.SetOutputToNull()
    $bytes = [System.IO.File]::ReadAllBytes($clipPath)
    $offset = 12
    $foundData = $false
    while ($offset + 8 -le $bytes.Length) {
      $chunkName = [System.Text.Encoding]::ASCII.GetString($bytes,$offset,4)
      $chunkSize = [BitConverter]::ToInt32($bytes,$offset+4)
      if ($chunkName -eq 'data') {
        $start = $pcm.Length / 44100
        $pcm.Write($bytes,$offset+8,$chunkSize)
        $cues += [ordered]@{speaker=$turn.speaker;label=$turn.label;text=$turn.text;start=[Math]::Round($start,3);end=[Math]::Round($pcm.Length/44100,3)}
        $foundData = $true
        break
      }
      $offset += 8 + $chunkSize + ($chunkSize % 2)
    }
    if (-not $foundData) { throw "No PCM data found in $clipPath" }
    if ($index -lt $turns.Count - 1) { $silence=New-Object byte[] 13230; $pcm.Write($silence,0,$silence.Length) }
  }
  $asset = Join-Path $outputPath 'redial-sample.wav'
  $writer = New-Object System.IO.BinaryWriter([System.IO.File]::Create($asset))
  try {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF')); $writer.Write([uint32]($pcm.Length+36))
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $writer.Write([uint32]16)
    $writer.Write([uint16]1); $writer.Write([uint16]1); $writer.Write([uint32]22050); $writer.Write([uint32]44100); $writer.Write([uint16]2); $writer.Write([uint16]16)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('data')); $writer.Write([uint32]$pcm.Length); $writer.Write($pcm.ToArray())
  } finally { $writer.Dispose() }
  $encoding = New-Object System.Text.UTF8Encoding($false)
  $manifest = [ordered]@{src='/audio/redial-sample.wav';duration=[Math]::Round($pcm.Length/44100,3);description='Original fictional call, synthesized offline with installed Windows voices. No real caller or provider audio.';turns=$cues} | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $projectRoot 'src/lib/landing/sample-call.json'),$manifest,$encoding)
  $captions = @('WEBVTT','')
  for ($index=0; $index -lt $cues.Count; $index++) {
    $cue=$cues[$index]
    $start=[TimeSpan]::FromSeconds($cue.start).ToString('hh\:mm\:ss\.fff')
    $end=[TimeSpan]::FromSeconds($cue.end).ToString('hh\:mm\:ss\.fff')
    $captions += @("$($index+1)","$start --> $end","$($cue.label): $($cue.text)",'')
  }
  [System.IO.File]::WriteAllText((Join-Path $outputPath 'redial-sample.vtt'),($captions -join "`n"),$encoding)
  Write-Output "Created fictional sample: $([Math]::Round($pcm.Length/44100,2)) seconds, $($cues.Count) turns."
} finally { $synth.Dispose(); $pcm.Dispose() }
