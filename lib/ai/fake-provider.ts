import {
  ModelAbortedError,
  type ModelProvider,
  type ModelRequest,
  type ModelResponse,
} from './provider';

export type FakeModelReply =
  | ModelResponse
  | Error
  | ((request: ModelRequest) => ModelResponse | Promise<ModelResponse>);

export type FakeModelProviderOptions = {
  replies: readonly FakeModelReply[];
  delayMs?: number;
  name?: string;
};

export class FakeModelProvider implements ModelProvider {
  readonly name: string;
  readonly requests: ModelRequest[] = [];
  private readonly replies: FakeModelReply[];
  private readonly delayMs: number;

  constructor(options: FakeModelProviderOptions) {
    this.name = options.name ?? 'fake';
    this.replies = [...options.replies];
    this.delayMs = options.delayMs ?? 0;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push({
      ...request,
      messages: request.messages.map((message) => ({ ...message })),
    });

    if (this.delayMs > 0) {
      await abortableDelay(this.delayMs, request.signal);
    }
    if (request.signal?.aborted) {
      throw new ModelAbortedError();
    }

    const reply = this.replies.shift();
    if (!reply) {
      throw new Error('Fake model provider has no queued reply');
    }
    if (reply instanceof Error) throw reply;
    return typeof reply === 'function' ? await reply(request) : reply;
  }
}

function abortableDelay(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ModelAbortedError());
      return;
    }

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new ModelAbortedError());
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
