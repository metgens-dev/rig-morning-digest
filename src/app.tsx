import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Digest } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    let rows;
    try {
      rows = readNight(config.runsDir, night).sort((left, right) => left.job.localeCompare(right.job));
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        return c.notFound();
      }
      throw error;
    }

    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <Digest night={night} rows={rows} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    try {
      const rows = readNight(config.runsDir, c.req.param('night'));
      return c.json(rows.sort((left, right) => left.job.localeCompare(right.job)));
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        return c.notFound();
      }

      throw error;
    }
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
