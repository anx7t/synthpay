const StellarSdk = require('@stellar/stellar-sdk');

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const NETWORK = StellarSdk.Networks.TESTNET;

const generateAgentWallet = () => {
  const keypair = StellarSdk.Keypair.random();
  return { publicKey: keypair.publicKey(), secretKey: keypair.secret() };
};

const fundWallet = async (publicKey) => {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  return res.json();
};

const getBalance = async (publicKey) => {
  const account = await server.loadAccount(publicKey);
  return account.balances;
};

const sendPayment = async (senderSecret, receiverPublic, amount) => {
  const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
  const account = await server.loadAccount(senderKeypair.publicKey());

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: receiverPublic,
      asset: StellarSdk.Asset.native(),
      amount: String(amount),
    }))
    .setTimeout(30)
    .build();

  tx.sign(senderKeypair);
  const result = await server.submitTransaction(tx);
  return { txHash: result.hash, success: true };
};

module.exports = { generateAgentWallet, fundWallet, getBalance, sendPayment };
