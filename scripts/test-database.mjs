import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
const image='postgres@sha256:3d0f7584ed7d04e27fa050d6683a74746608faf21f202be78460d679cc56461f';
const id=execFileSync('docker',['run','--rm','-d','--label','redial-purpose=isolated-rls-test','-e','POSTGRES_HOST_AUTH_METHOD=trust',image],{encoding:'utf8'}).trim();
try {
  let ready=false;
  for(let i=0;i<60;i++) {
    try { execFileSync('docker',['exec',id,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}); ready=true; break; } catch { await setTimeout(300); }
  }
  if(!ready) throw new Error('Isolated database did not become ready.');
  const sql=[readFileSync('supabase/tests/bootstrap.sql','utf8'),...readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync(`supabase/migrations/${f}`,'utf8')),readFileSync('supabase/tests/permissions.sql','utf8')].join('\n');
  process.stdout.write(execFileSync('docker',['exec','-i',id,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',maxBuffer:4*1024*1024}));
} finally { execFileSync('docker',['rm','-f',id],{stdio:'ignore'}); }
