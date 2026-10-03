import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeRun,
  dispatchBody,
  dispatchImport,
  importConnection,
  listImportRuns,
  toWorkflowRun,
} from '../github-actions';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const connected = () => {
  vi.stubEnv('GITHUB_ACTIONS_TOKEN', 'ghp_test');
  vi.stubEnv('GITHUB_REPOSITORY', 'brightexsolutions/beco-interiors');
  vi.stubEnv('GITHUB_WORKFLOW_REF', 'dev');
};

describe('importConnection', () => {
  it('names exactly what is missing, so the screen can say it', () => {
    vi.stubEnv('GITHUB_ACTIONS_TOKEN', '');
    vi.stubEnv('GITHUB_REPOSITORY', 'not a repo');
    expect(importConnection()).toEqual({ configured: false, missing: ['GITHUB_ACTIONS_TOKEN', 'GITHUB_REPOSITORY'] });
  });

  it('defaults the workflow ref to main, the branch production runs', () => {
    vi.stubEnv('GITHUB_ACTIONS_TOKEN', 'ghp_test');
    vi.stubEnv('GITHUB_REPOSITORY', 'brightexsolutions/beco-interiors');
    vi.stubEnv('GITHUB_WORKFLOW_REF', '');
    expect(importConnection()).toEqual({ configured: true, repo: 'brightexsolutions/beco-interiors', ref: 'main' });
  });
});

describe('dispatchImport', () => {
  it('posts the workflow inputs the workflow declares, and only those', async () => {
    connected();
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await dispatchImport({ mode: 'import', target: 'staging' });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/brightexsolutions/beco-interiors/actions/workflows/drive-import.yml/dispatches');
    expect(JSON.parse(String(init.body))).toEqual({ ref: 'dev', inputs: { mode: 'import', target: 'staging' } });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ghp_test');
  });

  it('refuses without a connection rather than calling GitHub with no token', async () => {
    vi.stubEnv('GITHUB_ACTIONS_TOKEN', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await dispatchImport({ mode: 'dry-run', target: 'staging' });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a GitHub refusal into a sentence, without GitHub\'s own text', async () => {
    connected();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Resource not accessible by personal access token at https://internal"}', { status: 403 })));
    const result = await dispatchImport({ mode: 'dry-run', target: 'staging' });
    expect(result).toEqual({ ok: false, error: 'GitHub refused the import (HTTP 403).' });
  });

  it('survives GitHub not answering', async () => {
    connected();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const result = await dispatchImport({ mode: 'dry-run', target: 'staging' });
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty('error', 'GitHub did not answer. Try again in a minute.');
  });

  it('dispatchBody is exactly ref plus the two inputs', () => {
    expect(dispatchBody({ mode: 'force', target: 'production' }, 'main')).toEqual({
      ref: 'main',
      inputs: { mode: 'force', target: 'production' },
    });
  });
});

describe('toWorkflowRun', () => {
  it('maps GitHub\'s shape and keeps only a github.com link', () => {
    expect(
      toWorkflowRun({
        id: 7, run_number: 12, display_title: 'Catalogue import, dry-run to staging', status: 'completed',
        conclusion: 'success', created_at: '2026-10-03T09:00:00Z', updated_at: '2026-10-03T09:04:00Z',
        html_url: 'https://github.com/brightexsolutions/beco-interiors/actions/runs/7', actor: { login: 'irene' },
      }),
    ).toEqual({
      id: 7, number: 12, name: 'Catalogue import, dry-run to staging', status: 'completed', conclusion: 'success',
      createdAt: '2026-10-03T09:00:00Z', updatedAt: '2026-10-03T09:04:00Z',
      url: 'https://github.com/brightexsolutions/beco-interiors/actions/runs/7', actor: 'irene',
    });
  });

  it('drops a link that is not github.com, and unknown statuses fall to unknown', () => {
    const run = toWorkflowRun({ id: 1, run_number: 1, status: 'weird', conclusion: 'odd', html_url: 'https://evil.example/x' });
    expect(run?.url).toBe('');
    expect(run?.status).toBe('unknown');
    expect(run?.conclusion).toBeNull();
  });

  it('returns null for anything that is not a run', () => {
    expect(toWorkflowRun(null)).toBeNull();
    expect(toWorkflowRun({ id: 'x' })).toBeNull();
  });
});

describe('listImportRuns', () => {
  it('returns nothing, and no error, when not connected', async () => {
    vi.stubEnv('GITHUB_ACTIONS_TOKEN', '');
    expect(await listImportRuns()).toEqual({ runs: [] });
  });

  it('lists the runs and skips malformed entries', async () => {
    connected();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ workflow_runs: [{ id: 1, run_number: 1, status: 'queued' }, { nope: true }] })));
    const result = await listImportRuns(5);
    expect(result.runs).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('names a listing failure without throwing', async () => {
    connected();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    expect(await listImportRuns()).toEqual({ runs: [], error: 'GitHub did not list the runs (HTTP 500).' });
  });
});

describe('describeRun', () => {
  it('reads each outcome in plain words with the matching tone', () => {
    expect(describeRun({ status: 'in_progress', conclusion: null })).toEqual({ label: 'Running', tone: 'neutral' });
    expect(describeRun({ status: 'queued', conclusion: null })).toEqual({ label: 'Queued', tone: 'neutral' });
    expect(describeRun({ status: 'waiting', conclusion: null })).toEqual({ label: 'Waiting for approval', tone: 'neutral' });
    expect(describeRun({ status: 'completed', conclusion: 'success' })).toEqual({ label: 'Done', tone: 'positive' });
    expect(describeRun({ status: 'completed', conclusion: 'failure' })).toEqual({ label: 'Failed', tone: 'attention' });
    expect(describeRun({ status: 'completed', conclusion: 'cancelled' })).toEqual({ label: 'Cancelled', tone: 'muted' });
  });
});
