import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow } from './types.js';

type RunStatus = DigestRow['lastStatus'];

type RunEvent = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

function isRunEvent(value: unknown): value is RunEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const event = value as Record<string, unknown>;
  return (
    typeof event.at === 'string' &&
    typeof event.job === 'string' &&
    (event.status === 'ok' || event.status === 'retry' || event.status === 'fail') &&
    (typeof event.owner === 'string' || event.owner === null) &&
    (event.error === undefined || typeof event.error === 'string')
  );
}

// One row per job, retaining the file order for the first and last recorded events.
export function readNight(runsDir: string, night: string): DigestRow[] {
  const file = join(runsDir, `${night}.jsonl`);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const rowsByJob = new Map<string, DigestRow>();
  let malformedLineCount = 0;

  for (const line of lines) {
    if (line === '') {
      continue;
    }

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLineCount += 1;
      continue;
    }

    if (!isRunEvent(value)) {
      malformedLineCount += 1;
      continue;
    }

    const existing = rowsByJob.get(value.job);
    if (existing === undefined) {
      rowsByJob.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstAt: value.at,
        lastAt: value.at,
      });
      continue;
    }

    existing.runs += 1;
    existing.retries += value.status === 'retry' ? 1 : 0;
    existing.lastStatus = value.status;
    existing.lastError = value.error ?? null;
    existing.lastAt = value.at;
  }

  void malformedLineCount;
  return [...rowsByJob.values()];
}
