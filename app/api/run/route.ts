import { GeminiProvider } from '../../../lib/ai';
import { scenarioInputSchema } from '../../../lib/domain';
import { runShadowScenario } from '../../../lib/shadow';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Request body must be JSON.' },
      { status: 400 },
    );
  }
  const parsed = scenarioInputSchema.safeParse(
    typeof body === 'object' && body !== null && 'scenario' in body
      ? body.scenario
      : undefined,
  );
  if (!parsed.success) {
    return Response.json(
      { error: 'A valid synthetic scheduling scenario is required.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const provider = apiKey ? new GeminiProvider({ apiKey }) : undefined;
  const run = await runShadowScenario(parsed.data, provider);

  return Response.json(run, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
