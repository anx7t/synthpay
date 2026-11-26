const StellarSdk = require('@stellar/stellar-sdk');

function getNetwork() {
  const net = (process.env.STELLAR_NETWORK || 'testnet').toLowerCase();
  if (net === 'mainnet' || net === 'public') {
    return {
      server: new StellarSdk.Horizon.Server('https://horizon.stellar.org'),
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    };
  }
  return {
    server: new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org'),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  };
}

function resolveAsset(asset = 'XLM') {
  const upper = (asset || 'XLM').toUpperCase();
  if (upper === 'XLM') return StellarSdk.Asset.native();
  if (upper === 'USDC') {
    const isMainnet = (process.env.STELLAR_NETWORK || 'testnet').toLowerCase() === 'mainnet';
    const issuer = isMainnet
      ? (process.env.USDC_ISSUER_MAINNET || 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN')
      : (process.env.USDC_ISSUER_TESTNET || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
    return new StellarSdk.Asset('USDC', issuer);
  }
  throw new Error(`Unsupported asset: ${asset}. Use XLM or USDC.`);
}

const generateAgentWallet = () => {
  const keypair = StellarSdk.Keypair.random();
  return { publicKey: keypair.publicKey(), secretKey: keypair.secret() };
};

const fundWallet = async (publicKey) => {
  if ((process.env.STELLAR_NETWORK || 'testnet').toLowerCase() === 'mainnet') {
    throw new Error('Friendbot is only available on testnet');
  }
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  return res.json();
};

const getBalance = async (publicKey) => {
  const { server } = getNetwork();
  const account = await server.loadAccount(publicKey);
  return account.balances;
};

// taskId and asset are optional. taskId attaches a memo so the tx is traceable on-chain.
const sendPayment = async (senderSecret, receiverPublic, amount, { taskId, asset = 'XLM' } = {}) => {
  const { server, networkPassphrase } = getNetwork();
  const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
  const account = await server.loadAccount(senderKeypair.publicKey());

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: receiverPublic,
      asset: resolveAsset(asset),
      amount: String(amount),
    }))
    .setTimeout(30);

  if (taskId) {
    // Stellar memo is max 28 bytes; prefix + id fits for typical DB bigint ids
    builder.addMemo(StellarSdk.Memo.text(`synthpay:${taskId}`.slice(0, 28)));
  }

  const tx = builder.build();
  tx.sign(senderKeypair);
  const result = await server.submitTransaction(tx);
  return { txHash: result.hash, success: true };
};

// Locks funds in a Stellar claimable balance when a task is posted.
// The agent can claim unconditionally; the employer can reclaim after 30 days.
const createEscrow = async (employerSecret, agentPublicKey, amount, taskId, asset = 'XLM') => {
  const { server, networkPassphrase } = getNetwork();
  const employerKeypair = StellarSdk.Keypair.fromSecret(employerSecret);
  const account = await server.loadAccount(employerKeypair.publicKey());

  const refundAfterTs = String(Math.floor(Date.now() / 1000) + 86400 * 30);

  const agentClaimant = new StellarSdk.Claimant(
    agentPublicKey,
    StellarSdk.Claimant.predicateUnconditional()
  );
  const refundClaimant = new StellarSdk.Claimant(
    employerKeypair.publicKey(),
    StellarSdk.Claimant.predicateNot(
      StellarSdk.Claimant.predicateBeforeAbsoluteTime(refundAfterTs)
    )
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.createClaimableBalance({
      asset: resolveAsset(asset),
      amount: String(amount),
      claimants: [agentClaimant, refundClaimant],
    }))
    .addMemo(StellarSdk.Memo.text(`synthpay:${taskId}`.slice(0, 28)))
    .setTimeout(30)
    .build();

  tx.sign(employerKeypair);
  const result = await server.submitTransaction(tx);

  // Balance ID is returned in the effects for the transaction
  const effects = await server.effects().forTransaction(result.hash).call();
  const created = effects.records.find(e => e.type === 'claimable_balance_created');

  return { txHash: result.hash, balanceId: created?.balance_id ?? null, success: true };
};

// Called by the agent after the employer verifies the task.
const claimEscrow = async (agentSecret, balanceId) => {
  const { server, networkPassphrase } = getNetwork();
  const agentKeypair = StellarSdk.Keypair.fromSecret(agentSecret);
  const account = await server.loadAccount(agentKeypair.publicKey());

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.claimClaimableBalance({ balanceId }))
    .setTimeout(30)
    .build();

  tx.sign(agentKeypair);
  const result = await server.submitTransaction(tx);
  return { txHash: result.hash, success: true };
};

// Returns recent transactions for a Stellar account, optionally filtered by exact memo text.
const getTransactions = async (publicKey, memoFilter) => {
  const { server } = getNetwork();
  const page = await server.transactions().forAccount(publicKey).order('desc').limit(50).call();

  const txs = page.records.map(tx => ({
    hash: tx.hash,
    createdAt: tx.created_at,
    memo: tx.memo ?? null,
    memoType: tx.memo_type ?? null,
    successful: tx.successful,
    ledger: tx.ledger_attr,
  }));

  if (memoFilter) return txs.filter(tx => tx.memo === memoFilter);
  return txs;
};

module.exports = { generateAgentWallet, fundWallet, getBalance, sendPayment, createEscrow, claimEscrow, getTransactions };
