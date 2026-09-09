import { NextResponse } from 'next/server';
type TreeEntry = { path: string; type: string; size?: number };
const cache = new Map<string, { time: number; data: unknown }>();
const source =
  /\.(tsx?|jsx?|mjs|cjs|py|rs|go|java|swift|kt|rb|php|vue|svelte|css|scss|html|json|md|ya?ml|sh|sql)$/i;
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
    const selected = tree.tree
      .filter(
        (f) =>
          f.type === 'blob' &&
          source.test(f.path) &&
          (f.size ?? 0) < 100000 &&
          !/(^|\/)(node_modules|vendor|dist|build|\.git|\.next)\//.test(
            f.path,
          ) &&
          !/(lock\.json|lock\.yaml|\.min\.)/.test(f.path),
      )
      .slice(0, 80);
    if (!selected.length)
      return NextResponse.json(
        {
          error:
            'No supported text source files were found in this repository.',
        },
        { status: 422 },
      );
    const files: Array<{
      path: string;
      code: string;
      lines: number;
      todos: number;
    }> = [];
    for (let i = 0; i < selected.length; i += 8) {
      const batch = await Promise.all(
        selected.slice(i, i + 8).map(async (f) => {
          const url = `https://raw.githubusercontent.com/${owner}/${name}/${encodeURIComponent(meta.default_branch)}/${f.path.split('/').map(encodeURIComponent).join('/')}`;
          const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok)
            throw new Error(`Could not load ${f.path}. Please try again.`);
          const code = await response.text();
          return {
            path: f.path,
            code,
            lines: code.split('\n').length,
            todos: (code.match(/\b(TODO|FIXME)\b/g) || []).length,
          };
        }),
      );
      files.push(...batch);
    }
    const data = {
      repo: `${owner} / ${name}`,
      branch: meta.default_branch,
      files,
      sampled: tree.truncated || selected.length === 80,
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
