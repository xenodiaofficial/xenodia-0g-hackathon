const baseUrl = process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:4041';

async function expectPage(path, checks) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  const html = await response.text();
  for (const check of checks) {
    if (!html.includes(check)) {
      throw new Error(`${path} is missing ${check}`);
    }
  }
  return html;
}

function expectMissing(path, html, checks) {
  for (const check of checks) {
    if (html.includes(check)) {
      throw new Error(`${path} still contains removed copy: ${check}`);
    }
  }
}

await expectPage('/', ['XENODIA', '0G HACKATHON BRANCH', '/0g-hackathon']);
const zeroGPage = await expectPage('/0g-hackathon', [
  'XENODIA 0G HACKATHON',
  'Verifiable infrastructure',
  'for agent capabilities on 0G',
  'Production capability use anchored to 0G',
  '/0g-proof-center',
  '0x3b1d2ea7951d2226eab1376158898e522baf08d07e6b4dc99ed2f3f58e8f1d04',
  '0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C',
  'chainscan.0g.ai',
  '0G_STORAGE_ROOTS',
]);
expectMissing('/0g-hackathon', zeroGPage, [
  'built on Xenodia product UI',
  'This branch keeps the normal Xenodia experience',
  'Back to Xenodia',
  'Offline revenue-share records',
]);
await expectPage('/docs/live-unicatcher-evidence.md', [
  'Live UniCatcher 0G Evidence',
  '0x2ba5c950aed84fd95b18c80026a6d6a5f890fc4435cc064981da88e65139d066',
  '0x171fd6a2af7544fa3ac8c715bae88a7ea5cf52348b5675c1fc60ffc8ff36ea2f',
]);
await expectPage('/0g-proof-center', [
  'XENODIA 0G PROOF CENTER',
  'Verify a capability',
  'Receipt ID',
  'Original API output',
]);

console.log('frontend smoke: passed');
