import { ethers } from "ethers";

const USDC_ADDRESSES: Record<string, string> = {
  "eip155:42161":  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "eip155:421614": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

const TRANSFER_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
};

export async function buildPaymentHeader(
  signer:     ethers.Wallet,
  payTo:      string,
  amountUsdc: string,
  network:    string = "eip155:42161"
): Promise<string> {
  const chainId     = Number(network.split(":")[1]);
  const usdcAddress = USDC_ADDRESSES[network];
  if (!usdcAddress) throw new Error(`Unsupported network: ${network}`);

  const rawAmount   = String(Math.round(parseFloat(amountUsdc) * 1_000_000));
  const validBefore = Math.floor(Date.now() / 1000) + 60;
  const nonce       = ethers.hexlify(ethers.randomBytes(32));

  const domain = {
    name:              "USD Coin",
    version:           "2",
    chainId,
    verifyingContract: usdcAddress,
  };

  const message = {
    from:        signer.address,
    to:          payTo,
    value:       BigInt(rawAmount),
    validAfter:  0n,
    validBefore: BigInt(validBefore),
    nonce,
  };

  const signature = await signer.signTypedData(domain, TRANSFER_TYPES, message);

  const payload = {
    x402Version: 1,
    scheme:      "exact",
    network,
    payload: {
      signature,
      authorization: {
        from:        signer.address,
        to:          payTo,
        value:       rawAmount,
        validAfter:  "0",
        validBefore: String(validBefore),
        nonce,
      },
    },
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
