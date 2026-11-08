import type { DigestRow } from '../digest/types.js';

function missing(value: string | null) {
  return value ?? <span class="mute">—</span>;
}

export function Digest({ night, rows }: { night: string; rows: DigestRow[] }) {
  const sortedRows = [...rows].sort((a, b) => a.job.localeCompare(b.job));

  return (
    <>
      <h1>digest · {night}</h1>
      {sortedRows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first ran</th>
              <th>last ran</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{missing(row.owner)}</td>
                <td>{row.runs}</td>
                <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
                <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
                <td>{missing(row.lastError)}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
