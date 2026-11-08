import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';

let runsDir: string;

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

function app() {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('digest page', () => {
  it('sorts jobs and marks three retries and failures', async () => {
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-28T23:00:00+01:00","job":"zeta","status":"ok","owner":"lane-07"}',
        '{"at":"2026-10-28T23:01:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
        '{"at":"2026-10-28T23:02:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
        '{"at":"2026-10-28T23:03:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
        '{"at":"2026-10-28T23:04:00+01:00","job":"alpha","status":"ok","owner":"rook"}',
        '{"at":"2026-10-28T23:05:00+01:00","job":"failed","status":"fail","owner":null,"error":"quota exceeded"}',
      ].join('\n'),
    );

    const res = await app().request('/digest/2026-10-28');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html.indexOf('<td>alpha</td>')).toBeLessThan(html.indexOf('<td>failed</td>'));
    expect(html.indexOf('<td>failed</td>')).toBeLessThan(html.indexOf('<td>zeta</td>'));
    expect(html).toContain('<td class="warn">3</td>');
    expect(html).toContain('<td class="warn">fail</td>');
    expect(html).toContain('<span class="mute">—</span>');
  });

  it('returns 404 when the night file is missing', async () => {
    const res = await app().request('/digest/2026-10-29');

    expect(res.status).toBe(404);
  });

  it('renders an empty night as nothing ran', async () => {
    writeFileSync(join(runsDir, '2026-10-30.jsonl'), '');

    const res = await app().request('/digest/2026-10-30');

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('renders valid rows when the night contains a malformed line', async () => {
    writeFileSync(
      join(runsDir, '2026-10-31.jsonl'),
      ['not json', '{"at":"2026-10-31T01:00:00+01:00","job":"alpha","status":"ok","owner":"rook"}'].join(
        '\n',
      ),
    );

    const res = await app().request('/digest/2026-10-31');

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<td>alpha</td>');
  });
});
