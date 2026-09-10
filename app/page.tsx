import { ShadowWorkspace } from '../components/shadow-workspace';
import { evaluationFixtures } from '../lib/evaluation';

export default function Home() {
  return (
    <ShadowWorkspace scenarios={evaluationFixtures.map(({ input }) => input)} />
  );
}
