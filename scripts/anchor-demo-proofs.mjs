import 'dotenv/config';
import { buildProofPayload, makeSeededDemoState } from '../demo/proof-model.mjs';
import { sendProofPayload } from '../demo/chain-anchor.mjs';

const sendTransactions = process.argv.includes('--send');

function makeDemoPayload() {
  return buildProofPayload(makeSeededDemoState());
}

const payload = makeDemoPayload();
const txs = sendTransactions ? await sendProofPayload(payload) : null;
console.log(JSON.stringify({ mode: sendTransactions ? 'sent' : 'dry-run', payload, txs }, null, 2));
