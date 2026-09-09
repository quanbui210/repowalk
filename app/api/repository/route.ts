import { NextResponse } from 'next/server';
type TreeEntry = { path: string; type: string; size?: number };
const cache = new Map<string, { time: number; data: unknown }>();
const source =
  /(?:\.(tsx?|jsx?|mjs|cjs|py|rs|go|java|swift|kt|rb|php|vue|svelte|css|scss|html|json|md|ya?ml|sh|sql|txt|toml|xml|c|h|cpp|hpp)|(?:^|\/)(README|LICENSE|Dockerfile|Makefile))$/i;
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== 'string')
      return NextResponse.json(
        { error: 'Enter a public GitHub repository URL.' },
        { status: 400 },
      );
    const match = body.url
      .trim()
      .match(/^(?:https:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)(?:\/)?$/);
    if (!match)
      return NextResponse.json(
        {
          error:
            'Use a repository URL such as https://github.com/owner/repository.',
        },
        { status: 400 },
      );
    const owner = match[1],
      name = match[2].replace(/\.git$/, ''),
      key = `${owner}/${name}`;
    const existing = cache.get(key);
    if (existing && Date.now() - existing.time < 300000)
      return NextResponse.json(existing.data);
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Repowalk-Explorer',
    };
    const info = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    if (!info.ok)
      return NextResponse.json(
        {
          error:
            info.status === 403 || info.status === 429
              ? 'GitHub’s public API limit has been reached. Please try again later.'
              : 'Repository not found. Check the URL and make sure it is public.',
        },
        { status: info.status === 403 ? 429 : 404 },
      );
    const meta = (await info.json()) as {
      default_branch: string;
      size: number;
    };
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
    if (!treeResponse.ok)
      throw new Error('Unable to read the repository tree. Please try again.');
    const tree = (await treeResponse.json()) as {
      tree: TreeEntry[];
      truncated: boolean;
    };
    const eligible = tree.tree.filter(
      (f) =>
        f.type === 'blob' &&
        source.test(f.path) &&
        (f.size ?? 0) < 250000 &&
        !/(^|\/)(node_modules|vendor|dist|build|\.git|\.next)\//.test(f.path) &&
        !/(lock\.json|lock\.yaml|\.min\.)/.test(f.path),
    );
    const selected = eligible.slice(0, 5000);
    if (!selected.length)
      return NextResponse.json(
        {
          error:
            'No supported text source files were found in this repository.',
        },
        { status: 422 },
      );
    const files = selected.map((f) => ({
      path: f.path,
      code: '',
      lines: 0,
      todos: 0,
      loaded: false,
    }));
    const data = {
      repo: `${owner} / ${name}`,
      branch: meta.default_branch,
      files,
      sampled: tree.truncated || eligible.length > 5000,
    };
    if (cache.size >= 8) cache.delete(cache.keys().next().value!);
    cache.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load the repository.',
      },
      { status: 502 },
    );
  }
}
