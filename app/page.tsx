import fixtureJson from '../data/scenarios/flight_buffer.json';
import { loadScenarioFixture } from '../lib/domain';
import { ShadowWorkspace } from '../components/shadow-workspace';

export default function Home() {
  const scenario = loadScenarioFixture(fixtureJson, 'flight_buffer.json').input;
  return <ShadowWorkspace scenario={scenario} />;
}
