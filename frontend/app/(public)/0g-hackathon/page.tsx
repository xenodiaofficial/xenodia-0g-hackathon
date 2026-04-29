import ZeroGHackathonPage from '@/components/ZeroGHackathonPage';
import { buildMetadata } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Xenodia 0G Hackathon Evidence',
  description:
    'Judge-visible Xenodia 0G integration evidence for provider identity, service receipts, settlement records, 0G Storage, and 0G Chain proofs.',
  path: '/0g-hackathon',
});

export default function ZeroGHackathonRoute() {
  return <ZeroGHackathonPage />;
}
