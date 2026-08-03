import type { GitHubHealth } from './types'

const DEFAULT_REPOSITORY = 'wiltonbatistadejesus/zafi'

function headers() {
  const token = process.env.GITHUB_TOKEN?.trim()
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  }
}

export async function getGitHubHealth(from: string, to: string): Promise<GitHubHealth> {
  const repository = process.env.GITHUB_REPOSITORY?.trim() || DEFAULT_REPOSITORY
  try {
    const base = 'https://api.github.com/repos/' + repository
    const [issuesResponse, pullsResponse] = await Promise.all([
      fetch(base + '/issues?state=all&since=' + encodeURIComponent(from) + '&per_page=100', {
        headers: headers(),
        next: { revalidate: 300 },
      }),
      fetch(base + '/pulls?state=all&sort=updated&direction=desc&per_page=100', {
        headers: headers(),
        next: { revalidate: 300 },
      }),
    ])
    if (!issuesResponse.ok || !pullsResponse.ok) {
      return {
        status: 'not_connected', repository,
        issuesOpen: null, issuesClosed: null, prsOpen: null, prsMerged: null,
        detail: 'GitHub não respondeu (' + issuesResponse.status + '/' + pullsResponse.status + ').',
      }
    }

    const fromTime = new Date(from).getTime()
    const toTime = new Date(to).getTime()
    const issues = await issuesResponse.json() as Array<{ state: string; closed_at: string | null; pull_request?: unknown }>
    const pulls = await pullsResponse.json() as Array<{ state: string; merged_at: string | null }>
    const inPeriod = (value: string | null) => {
      if (!value) return false
      const time = new Date(value).getTime()
      return time >= fromTime && time < toTime
    }

    return {
      status: 'working',
      repository,
      issuesOpen: issues.filter((item) => !item.pull_request && item.state === 'open').length,
      issuesClosed: issues.filter((item) => !item.pull_request && inPeriod(item.closed_at)).length,
      prsOpen: pulls.filter((item) => item.state === 'open').length,
      prsMerged: pulls.filter((item) => inPeriod(item.merged_at)).length,
      detail: 'GitHub consultado pelo servidor; credenciais nunca chegam ao navegador.',
    }
  } catch {
    return {
      status: 'not_connected', repository,
      issuesOpen: null, issuesClosed: null, prsOpen: null, prsMerged: null,
      detail: 'GitHub indisponível; o dashboard continua funcionando com as fontes internas.',
    }
  }
}
