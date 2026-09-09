import { NextResponse } from 'next/server';
import { analyzeSource } from '@/lib/analyze-source';
export async function POST(request: Request) {
  try {
    const { repo, branch, path } = (await request.json()) as {
      repo?: unknown;
      branch?: unknown;
      path?: unknown;
    };
    if (
      typeof repo !== 'string' ||
      !/^\w[\w.-]*\/[\w.-]+$/.test(repo) ||
      typeof branch !== 'string' ||
      !branch ||
      typeof path !== 'string' ||
      !path ||
      path.split('/').some((part) => !part || part === '.' || part === '..') ||
      path.includes('\\')
    )
      return NextResponse.json(
        { error: 'A valid repository, branch, and file path are required.' },
        { status: 400 },
      );
    const response = await fetch(
      `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'This file is no longer available on the current branch. Reload the repository.'
              : 'GitHub could not return this file. Please try again.',
        },
        { status: response.status === 404 ? 404 : 502 },
      );
    if (!response.body) throw new Error('The file response was empty.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 250000) {
        await reader.cancel();
        return NextResponse.json(
          { error: 'This source file exceeds the 250 KB reader limit.' },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const code = new TextDecoder().decode(merged);
    return NextResponse.json({
      path,
      code,
      lines: code.split('\n').length,
      todos: (code.match(/\b(TODO|FIXME)\b/g) || []).length,
      loaded: true,
      analysis: analyzeSource(code, path),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to load source.',
      },
      { status: 502 },
    );
  }
}
