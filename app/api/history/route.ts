import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    const { repo } = (await request.json()) as { repo?: unknown };
    if (typeof repo !== 'string' || !/^\w[\w.-]*\/[\w.-]+$/.test(repo))
      return NextResponse.json(
        { error: 'A valid public repository is required.' },
        { status: 400 },
      );
    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits?per_page=20`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Repowalk-Explorer',
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 403 || response.status === 429
              ? 'GitHub’s public API limit has been reached. Try history again later.'
              : 'Could not load commit history.',
        },
        { status: 502 },
      );
    const commits = (await response.json()) as Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }>;
    return NextResponse.json({
      commits: commits.map((c) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        date: c.commit.author.date,
        author: c.commit.author.name,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to load history.',
      },
      { status: 502 },
    );
  }
}
