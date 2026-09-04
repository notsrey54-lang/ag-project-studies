import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('the browser studio never contains a privileged Supabase key', async () => {
  const studioApi = await readSource('../src/lib/studioApi.js');
  const supabaseClient = await readSource('../src/lib/supabaseClient.js');
  assert.doesNotMatch(studioApi, /service[_ -]?role/i);
  assert.doesNotMatch(studioApi, /sb_secret_/i);
  assert.doesNotMatch(supabaseClient, /service[_ -]?role/i);
  assert.doesNotMatch(supabaseClient, /sb_secret_/i);
});

test('HTML imports remove executable and source-theme elements before conversion', async () => {
  const importer = await readSource('../src/lib/htmlImporter.js');
  assert.match(importer, /script, style, iframe, object, embed, form, input, button, meta, link, base, template, noscript/);
  assert.match(importer, /startsWith\('on'\)/);
  assert.match(importer, /\['style', 'class', 'id'\]/);
  assert.doesNotMatch(importer, /dangerouslySetInnerHTML/);
});

test('the protected publisher is pinned and supports the complete free asset set', async () => {
  const publisher = await readSource('../supabase/functions/content-publish/index.ts');
  assert.match(publisher, /supabase-js@2\.115\.0/);
  assert.match(publisher, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
  assert.match(publisher, /application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation/);
  assert.match(publisher, /video\/mp4/);
  assert.match(publisher, /audio\/ogg/);
  assert.match(publisher, /block_type: text\(item\.type \|\| item\.blockType/);
  assert.match(publisher, /tool_type: text\(item\.type \|\| item\.toolType/);
  assert.match(publisher, /if \(!originIsAllowed\(request\)\)/);
  assert.match(publisher, /isAuthorized\(db, body\.password\)/);
});
