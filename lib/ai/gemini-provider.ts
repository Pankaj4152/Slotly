import { z } from 'zod';

import {
  ModelProviderError,
  type ModelProvider,
  type ModelRequest,
  type ModelResponse,
} from './provider';

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().int().nonnegative().optional(),
      candidatesTokenCount: z.number().int().nonnegative().optional(),
    })
    .optional(),
  modelVersion: z.string().optional(),
});

export type GeminiProviderOptions = {
  apiKey: string;
  model?: string;
  fetchImplementation?: typeof fetch;
};

export class GeminiProvider implements ModelProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: GeminiProviderOptions) {
    if (!options.apiKey.trim()) throw new Error('Gemini API key is required');
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'gemini-2.5-flash-lite';
    if (!/^[a-zA-Z0-9._-]+$/.test(this.model)) {
      throw new Error('Gemini model contains unsupported characters');
    }
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const systemText = request.messages
      .filter(({ role }) => role === 'system')
      .map(({ content }) => content)
      .join('\n\n');
    const contents = request.messages
      .filter(({ role }) => role !== 'system')
      .map(({ role, content }) => ({
        role: role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
      }));
    const response = await this.fetchImplementation(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: 'POST',
        signal: request.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents,
          ...(systemText
            ? { systemInstruction: { parts: [{ text: systemText }] } }
            : {}),
          generationConfig: {
            ...(request.responseFormat === 'json'
              ? { responseMimeType: 'application/json' }
              : {}),
            ...(request.temperature === undefined
              ? {}
              : { temperature: request.temperature }),
          },
        }),
      },
    );

    if (!response.ok) {
      throw new ModelProviderError(
        `Gemini request failed with status ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new ModelProviderError('Gemini returned a non-JSON response', {
        cause: error,
      });
    }
    const parsed = geminiResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ModelProviderError(
        'Gemini response did not match the API contract',
        {
          cause: parsed.error,
        },
      );
    }

    const text = parsed.data.candidates?.[0]?.content.parts
      .map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!text) {
      const blockReason = parsed.data.promptFeedback?.blockReason;
      throw new ModelProviderError(
        blockReason
          ? `Gemini blocked the request: ${blockReason}`
          : 'Gemini returned no text candidate',
      );
    }

    return {
      text,
      model: parsed.data.modelVersion ?? this.model,
      usage: {
        inputTokens: parsed.data.usageMetadata?.promptTokenCount,
        outputTokens: parsed.data.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
