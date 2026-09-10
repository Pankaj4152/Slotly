import fixtureJson from '../../../data/scenarios/flight_buffer.json';
import { GeminiProvider } from '../../../lib/ai';
import { loadScenarioFixture } from '../../../lib/domain';
import { runShadowScenario } from '../../../lib/shadow';

export async function POST() {
  const scenario = loadScenarioFixture(fixtureJson, 'flight_buffer.json').input;
  const apiKey = process.env.GEMINI_API_KEY;
  const provider = apiKey ? new GeminiProvider({ apiKey }) : undefined;
  const run = await runShadowScenario(scenario, provider);

  return Response.json(run, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
