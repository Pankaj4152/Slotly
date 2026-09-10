import { describe, expect, it } from 'vitest';

import { FakeModelProvider } from './fake-provider';
import {
  generateWithTimeout,
  ModelAbortedError,
  ModelProviderError,
  ModelTimeoutError,
  type ModelResponse,
} from './provider';

const response: ModelResponse = {
  text: '{"durationMinutes":30}',
  model: 'deterministic-test-model',
  usage: { inputTokens: 12, outputTokens: 6 },
};

const request = {
  messages: [
    {
      role: 'system' as const,
      content: 'Return structured scheduling intent.',
    },
    { role: 'user' as const, content: 'Find 30 minutes tomorrow.' },
  ],
  responseFormat: 'json' as const,
};

describe('FakeModelProvider', () => {
  it('returns queued deterministic responses and records requests', async () => {
    const provider = new FakeModelProvider({ replies: [response] });

    await expect(generateWithTimeout(provider, request)).resolves.toEqual(
      response,
    );
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]).toMatchObject(request);
  });

  it('supports request-aware deterministic replies', async () => {
    const provider = new FakeModelProvider({
      replies: [
        (received) => ({
          ...response,
          text: received.messages.at(-1)?.content ?? '',
        }),
      ],
    });

    await expect(generateWithTimeout(provider, request)).resolves.toMatchObject(
      {
        text: 'Find 30 minutes tomorrow.',
      },
    );
  });
});

describe('generateWithTimeout', () => {
  it('aborts slow providers with a typed timeout error', async () => {
    const provider = new FakeModelProvider({
      replies: [response],
      delayMs: 50,
    });

    await expect(
      generateWithTimeout(provider, request, 5),
    ).rejects.toBeInstanceOf(ModelTimeoutError);
  });

  it('distinguishes caller cancellation from timeout', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new FakeModelProvider({ replies: [response] });

    await expect(
      generateWithTimeout(provider, { ...request, signal: controller.signal }),
    ).rejects.toBeInstanceOf(ModelAbortedError);
    expect(provider.requests).toHaveLength(0);
  });

  it('preserves typed provider errors', async () => {
    const providerError = new ModelProviderError('Provider unavailable');
    const provider = new FakeModelProvider({ replies: [providerError] });

    await expect(generateWithTimeout(provider, request)).rejects.toBe(
      providerError,
    );
  });

  it('wraps unexpected provider failures at the boundary', async () => {
    const failure = new Error('socket closed');
    const provider = new FakeModelProvider({
      replies: [failure],
      name: 'example',
    });

    await expect(generateWithTimeout(provider, request)).rejects.toMatchObject({
      name: 'ModelProviderError',
      message: 'example model request failed',
      cause: failure,
    });
  });

  it.each([0, -1, 1.5])(
    'rejects invalid timeout value %s',
    async (timeoutMs) => {
      const provider = new FakeModelProvider({ replies: [response] });

      await expect(
        generateWithTimeout(provider, request, timeoutMs),
      ).rejects.toBeInstanceOf(RangeError);
      expect(provider.requests).toHaveLength(0);
    },
  );
});
