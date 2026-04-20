// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

/**
 * One-click example parameters per tool.
 * Keys are tool names; each value is an array of { label, params }.
 */
export const TOOL_PRESETS = {
  read_file: [
    { label: 'Read notes.json', params: { path: './storage/notes.json' } },
  ],
  write_file: [
    {
      label: 'Write hello.txt',
      params: { path: './workspace/hello.txt', content: 'hello from FORGE' },
    },
  ],
  list_directory: [
    { label: 'List ./storage', params: { path: './storage' } },
    { label: 'List ./workspace', params: { path: './workspace' } },
  ],
  web_search: [
    { label: 'Model Context Protocol', params: { query: 'Model Context Protocol Anthropic', max_results: '3' } },
    { label: 'FastAPI docs', params: { query: 'python fastapi documentation', max_results: '3' } },
  ],
  fetch_url: [
    { label: 'example.com', params: { url: 'https://example.com', max_chars: '1000' } },
    { label: 'Anthropic site', params: { url: 'https://www.anthropic.com', max_chars: '2000' } },
  ],
  run_code: [
    {
      label: 'Sum of squares',
      params: { code: 'nums = [1,2,3,4,5]\nprint("sum:", sum(n*n for n in nums))' },
    },
    {
      label: 'Sandbox test (blocked)',
      params: { code: 'import os\nprint(os.listdir())' },
    },
  ],
  calculate: [
    { label: '(2**10) + 42', params: { expression: '(2**10) + 42' } },
    { label: 'math.sqrt(144)', params: { expression: 'math.sqrt(144)' } },
    { label: '2 * math.pi', params: { expression: '2 * math.pi' } },
  ],
  query_notes: [
    { label: 'List all notes', params: { action: 'list' } },
    { label: 'Set demo = hello', params: { action: 'set', key: 'demo', content: 'hello from FORGE' } },
    { label: 'Get demo', params: { action: 'get', key: 'demo' } },
    { label: 'Delete demo', params: { action: 'delete', key: 'demo' } },
  ],
  get_weather: [
    { label: 'Bangalore', params: { city: 'Bangalore' } },
    { label: 'San Francisco', params: { city: 'San Francisco' } },
    { label: 'Tokyo', params: { city: 'Tokyo' } },
  ],
  analyze_csv: [
    { label: 'workspace/demo.csv', params: { path: './workspace/demo.csv' } },
  ],
};
