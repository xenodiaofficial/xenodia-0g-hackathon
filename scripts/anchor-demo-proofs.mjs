import 'dotenv/config';
import { buildProofPayload, makeInitialState, mockExecuteCapability } from '../demo/proof-model.mjs';
import { sendProofPayload } from '../demo/chain-anchor.mjs';

const sendTransactions = process.argv.includes('--send');

function makeDemoPayload() {
  const state = makeInitialState();
  const prompts = [
    'Find x402 payment-aware providers for an autonomous agent.',
    'Rank capability providers by verifiable receipts and risk.',
    'Prepare offline settlement evidence for a paid skill invocation.'
  ];

  prompts.forEach((prompt, index) => {
    const { response, receipt } = mockExecuteCapability(state, {
      prompt,
      createdAt: `2026-04-24T00:0${index}:00.000Z`
    });
    state.invocations.unshift({ id: receipt.receiptId, prompt, response, receipt });
  });

  return buildProofPayload(state);
}

const payload = makeDemoPayload();
const txs = sendTransactions ? await sendProofPayload(payload) : null;
console.log(JSON.stringify({ mode: sendTransactions ? 'sent' : 'dry-run', payload, txs }, null, 2));
