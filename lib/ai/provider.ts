export type ModelMessageRole = 'system' | 'user' | 'assistant';

export type ModelMessage = {
  role: ModelMessageRole;
  content: string;
};

export type ModelRequest = {
  messages: readonly ModelMessage[];
  responseFormat?: 'json' | 'text';
  temperature?: number;
  signal?: AbortSignal;
};

export type ModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelResponse = {
  text: string;
  model: string;
  usage?: ModelUsage;
};

export interface ModelProvider {
  readonly name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
}

export class ModelProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ModelProviderError';
  }
}

export class ModelTimeoutError extends ModelProviderError {
  constructor(timeoutMs: number) {
    super(`Model request exceeded the ${timeoutMs}ms timeout`);
    this.name = 'ModelTimeoutError';
  }
}

export class ModelAbortedError extends ModelProviderError {
  constructor() {
    super('Model request was aborted');
    this.name = 'ModelAbortedError';
  }
}

export async function generateWithTimeout(
  provider: ModelProvider,
  request: ModelRequest,
  timeoutMs = 10_000,
): Promise<ModelResponse> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be a positive integer');
  }

  if (request.signal?.aborted) {
    throw new ModelAbortedError();
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(request.signal?.reason);
  request.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new ModelTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      provider.generate({ ...request, signal: controller.signal }),
      timeout,
    ]);
  } catch (error) {
    if (timedOut || error instanceof ModelTimeoutError) {
      throw new ModelTimeoutError(timeoutMs);
    }
    if (request.signal?.aborted) {
      throw new ModelAbortedError();
    }
    if (error instanceof ModelProviderError) {
      throw error;
    }
    throw new ModelProviderError(`${provider.name} model request failed`, {
      cause: error,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    request.signal?.removeEventListener('abort', abortFromCaller);
  }
}
