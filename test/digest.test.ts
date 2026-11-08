import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-reader-'));

afterAll(() => rmSync(runsDir, { force: true, recursive: true }));

describe('readNight', () => {
  it('aggregates the fixture into five jobs and skips its malformed line', () => {
    expect(readNight('runs', '2026-10-28')).toEqual([
      {
        job: 'rig/rotate-logs',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:02+01:00',
        lastAt: '2026-10-28T23:00:02+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 8,
        retries: 1,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:06+01:00',
        lastAt: '2026-10-29T05:00:04+01:00',
      },
      {
        job: 'fixtures/refresh',
        owner: 'rook',
        runs: 4,
        retries: 3,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T01:30:00+01:00',
        lastAt: '2026-10-29T01:37:00+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        firstAt: '2026-10-29T04:00:01+01:00',
        lastAt: '2026-10-29T04:00:01+01:00',
      },
      {
        job: 'digest/render',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T05:41:09+01:00',
        lastAt: '2026-10-29T05:41:09+01:00',
      },
    ]);
  });

  it('normalizes blank optional fields and skips blank job or timestamp fields', () => {
    writeFileSync(
      join(runsDir, 'blank-fields.jsonl'),
      [
        '{"at":"2026-11-08T05:00:00+01:00","job":"report","status":"fail","owner":"  ","error":"\\t"}',
        '{"at":" ","job":"missing-time","status":"ok","owner":null}',
        '{"at":"2026-11-08T05:01:00+01:00","job":"\\t","status":"ok","owner":null}',
      ].join('\n'),
    );

    expect(readNight(runsDir, 'blank-fields')).toEqual([
      {
        job: 'report',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: null,
        firstAt: '2026-11-08T05:00:00+01:00',
        lastAt: '2026-11-08T05:00:00+01:00',
      },
    ]);
  });
});
