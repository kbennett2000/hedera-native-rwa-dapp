export function TeachingBanner() {
  return (
    <div className="teaching">
      <strong>Native Hedera, not EVM.</strong> Associate and transfer are native HTS transactions —
      MetaMask can&rsquo;t sign them, so this app connects a Hedera wallet (HashPack) via
      WalletConnect. Compliance (KYC / freeze / pause) is enforced by the network at consensus, not
      by a Solidity contract.
    </div>
  );
}
