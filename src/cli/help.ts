import { displayFlag, flags } from './flags.ts'

const WIDTH = 80

export const usage =
  'Usage: rewait [options] <check> [check options] [<check> [check options]...]'

const intro = `rewait waits for external resources to become available.

${usage}

Each check is a URL. The scheme selects the kind of check:

  http://host[:port]/path    HTTP request succeeds (2xx or 3xx by default)
  https://host[:port]/path   The same, over TLS
  tcp://host:port            TCP connection is accepted
  unix:///path/to.sock       Unix domain socket connection is accepted
  udp://host:port            UDP socket connects. Connecting never fails, so
                             use --send and a --body option to verify a reply
  file:///path or /path      File exists

Options after a check apply to that check only. Global options may appear
anywhere. Checks run in parallel, and rewait exits successfully once every
check has passed, or with an error once the timeout elapses.

Durations accept the suffixes ms, s, m and h (500ms, 5s, 2m). A bare number is
milliseconds. Data values starting with @ are read from the named file.`

const examples = `Examples:
  # Wait for a database and a web service before starting
  rewait -t 90s tcp://db:5432 http://api:8080/healthz && exec node server.js

  # POST with a bearer token and check the reply
  rewait https://api.example.com/ping -X POST \\
    -H "Authorization: Bearer $TOKEN" -d '{"probe":true}' \\
    --status 200 --body-substring '"ok":true'

  # Send a datagram and wait for a matching reply
  rewait udp://statsd:8125 --send 'health' --body-regex '^ok'

  # Docker HEALTHCHECK: try once, Docker handles retries
  HEALTHCHECK CMD rewait --once --max-time 2s http://localhost:8080/healthz

Exit codes:
  0  every check passed
  1  the timeout elapsed, or a check failed with --once
  2  usage error`

/**
 * Wrap text to fit within `width` columns
 */
function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  lines.push(line)
  return lines
}

function renderOptions(): string {
  const groups = new Map<string, string[]>()
  const left = flags.map(spec => {
    const name = spec.alias ? displayFlag(spec) : `    --${spec.name}` // align with "-x, --name"
    return spec.arg ? `${name} <${spec.arg}>` : name
  })
  const column = Math.max(...left.map(s => s.length)) + 3
  flags.forEach((spec, idx) => {
    const lines = wrap(spec.help, WIDTH - column)
    const rendered = [
      `  ${left[idx].padEnd(column - 2)}${lines[0]}`,
      ...lines.slice(1).map(line => `${' '.repeat(column)}${line}`),
    ].join('\n')
    const group = groups.get(spec.group) || []
    group.push(rendered)
    groups.set(spec.group, group)
  })
  return [...groups.entries()]
    .map(([title, lines]) => `${title}:\n${lines.join('\n')}`)
    .join('\n\n')
}

/**
 * The full text of `rewait --help`
 */
export function renderHelp(): string {
  return `${intro}\n\n${renderOptions()}\n\n${examples}\n`
}

/**
 * The contents of docs/cli.md, which mirrors `rewait --help`
 */
export function renderCliDocs(): string {
  return `rewait CLI
==========

Install with \`npm i -g rewait\`, or run it with \`npx rewait\`. This page is the
output of \`rewait --help\`.

\`\`\`
${renderHelp()}\`\`\`
`
}
