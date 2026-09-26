import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Prints every migration in filename order, for pasting into the Supabase SQL
// editor or piping to psql. Deliberately generated rather than kept as a second
// copy in the repository, so it can never drift from supabase/migrations.
const dir = path.join(import.meta.dirname, '..', 'supabase', 'migrations');
const files = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort();
const only = process.argv[2];
const selected = only ? files.filter(name => name >= only) : files;
process.stdout.write(`-- Redial schema: ${selected.length} migration${selected.length === 1 ? '' : 's'}, in order.\n`);
process.stdout.write('-- Each file is its own transaction. Apply them in this order and only once.\n\n');
for (const name of selected) {
  process.stdout.write(`-- ${'='.repeat(70)}\n-- ${name}\n-- ${'='.repeat(70)}\n`);
  process.stdout.write(await readFile(path.join(dir, name), 'utf8'));
  process.stdout.write('\n\n');
}
