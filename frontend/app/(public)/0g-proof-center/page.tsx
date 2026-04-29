import ZeroGProofCenterPage from '@/components/ZeroGProofCenterPage';
import { buildMetadata } from '@/lib/site';

export const metadata = buildMetadata({
  title: '0G Proof Center | Xenodia',
  description:
    'Verify Xenodia capability receipts by recomputing input/output hashes and checking local or 0G-anchored evidence.',
  path: '/0g-proof-center',
});

export default function ZeroGProofCenterRoute() {
  return <ZeroGProofCenterPage />;
}
