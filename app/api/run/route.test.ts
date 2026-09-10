import { afterEach, describe, expect, it, vi } from 'vitest';

import { evaluationFixtures } from '../../../lib/evaluation';
import { POST } from './route';

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/run', () => {
  it('runs the selected synthetic scenario', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const scenario = evaluationFixtures.find(
      ({ input }) => input.id === 'move_requires_permission',
    )?.input;
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });

    const response = await POST(request);
    const result = (await response.json()) as {
      decision: { action: string };
      validation: { status: string };
    };

    expect(response.status).toBe(200);
    expect(result.decision.action).toBe('ASK');
    expect(result.validation.status).toBe('VALID');
  });

  it('rejects an invalid scenario payload', async () => {
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: { id: 'incomplete' } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects a non-JSON request', async () => {
    const request = new Request('http://localhost/api/run', {
      method: 'POST',
      body: 'not json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
