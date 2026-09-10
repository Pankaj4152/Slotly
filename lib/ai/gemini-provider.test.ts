import { describe, expect, it, vi } from 'vitest';

import { GeminiProvider } from './gemini-provider';
import { ModelProviderError } from './provider';

const request = {
  messages: [
    { role: 'system' as const, content: 'Return JSON.' },
    { role: 'user' as const, content: 'Extract this request.' },
  ],
  responseFormat: 'json' as const,
  temperature: 0,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GeminiProvider', () => {
  it('maps the generic contract to Gemini generateContent', async () => {
    const mockedFetch = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
        modelVersion: 'gemini-test-version',
      }),
    );
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      fetchImplementation: mockedFetch,
    });

    await expect(provider.generate(request)).resolves.toEqual({
      text: '{"ok":true}',
      model: 'gemini-test-version',
      usage: { inputTokens: 10, outputTokens: 4 },
    });
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toContain('gemini-2.5-flash-lite:generateContent');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
    if (typeof init?.body !== 'string')
      throw new Error('Expected JSON request body');
    expect(JSON.parse(init.body)).toMatchObject({
      systemInstruction: { parts: [{ text: 'Return JSON.' }] },
      contents: [{ role: 'user', parts: [{ text: 'Extract this request.' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });
  });

  it('reports HTTP failures without leaking credentials', async () => {
    const mockedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: 'bad key' }, 401));
    const provider = new GeminiProvider({
      apiKey: 'secret-key',
      fetchImplementation: mockedFetch,
    });

    await expect(provider.generate(request)).rejects.toMatchObject({
      name: 'ModelProviderError',
      message: 'Gemini request failed with status 401',
    });
    await provider.generate(request).catch((error: unknown) => {
      expect(String(error)).not.toContain('secret-key');
    });
  });

  it('reports blocked and malformed responses explicitly', async () => {
    const blocked = new GeminiProvider({
      apiKey: 'test',
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }),
        ),
    });
    await expect(blocked.generate(request)).rejects.toThrow(
      'Gemini blocked the request: SAFETY',
    );

    const malformed = new GeminiProvider({
      apiKey: 'test',
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse({ candidates: [{ unexpected: true }] }),
        ),
    });
    await expect(malformed.generate(request)).rejects.toBeInstanceOf(
      ModelProviderError,
    );
  });

  it('rejects missing keys and unsafe model names', () => {
    expect(() => new GeminiProvider({ apiKey: ' ' })).toThrow(
      'API key is required',
    );
    expect(
      () => new GeminiProvider({ apiKey: 'test', model: '../other-model' }),
    ).toThrow('unsupported characters');
  });
});
