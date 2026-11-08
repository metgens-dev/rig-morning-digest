import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-route-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };

writeFileSync(
  join(runsDir, '2026-10-28.jsonl'),
  [
    '{"at":"2026-10-29T05:00:00+01:00","job":"zeta","status":"ok","owner":"lane-07"}',
    '{"at":"2026-10-29T01:00:00+01:00","job":"alpha","status":"retry","owner":null,"error":"try again"}',
    'not json',
    '{"at":"2026-10-29T01:01:00+01:00","job":"alpha","status":"fail","owner":null,"error":"failed"}',
  ].join('\n'),
);

afterAll(() => rmSync(runsDir, { force: true, recursive: true }));

describe('digest JSON', () => {
  it('returns the digest rows sorted by job', async () => {
    const response = await createApp(config).request('/api/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        job: 'alpha',
        owner: null,
        runs: 2,
        retries: 1,
        lastStatus: 'fail',
        lastError: 'failed',
        firstAt: '2026-10-29T01:00:00+01:00',
        lastAt: '2026-10-29T01:01:00+01:00',
      },
      {
        job: 'zeta',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T05:00:00+01:00',
        lastAt: '2026-10-29T05:00:00+01:00',
      },
    ]);
  });

  it('returns 404 when the night is absent', async () => {
    const response = await createApp(config).request('/api/digest/1900-01-01');

    expect(response.status).toBe(404);
  });

  it('returns an empty array for an empty night', async () => {
    writeFileSync(join(runsDir, '2026-10-30.jsonl'), '');

    const response = await createApp(config).request('/api/digest/2026-10-30');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
