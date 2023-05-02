import type { RequestArguments } from "~types";
import { extensionStore, SIMULATIONS_ON, SKIP_MARKETPLACES } from "~utils/extension-store";

/// Known Marketplaces that we can skip for hyperdrive.
const KNOWN_MARKETPLACES = [
  // Opensea Seaport 1.1
  "0x00000000006c3852cbef3e08e8df289169ede581",
  // Opensea Seaport 1.4
  "0x00000000000001ad428e4906ae43d8f9852d0dd6",
  // Blur
  "0x000000000000ad05ccc4f10045630fb830b95127",
  // Blur
  "0x39da41747a83aee658334415666f3ef92dd0d541",
  // X2Y2
  "0x74312363e45dcaba76c59ec49a7aa8a65a67eed3",
  // Looksrare
  "0x59728544b08ab483533076417fbbb2fd0b17ce3a"
];

// Supported chains.
const ETHEREUM_CHAIN_ID = "0x1";
const POLYGON_CHAIN_ID = "0x89";
const ARBITRUM_CHAIN_ID = "0xa4b1";
const BSC_CHAIN_ID = "0x38";

export const isSupportedChainId = (chainId: string) => {
  chainId = chainId.toLowerCase();

  return (
    chainId === ETHEREUM_CHAIN_ID ||
    chainId === POLYGON_CHAIN_ID ||
    chainId === ARBITRUM_CHAIN_ID ||
    chainId === BSC_CHAIN_ID
  );
};

/// Check whether we should skip this transaction.
///
/// This should run in the content script in order to retrieve settings.
export const shouldSkip = async (data: RequestArguments) => {
  // Unsupported chain id.
  if (!isSupportedChainId(data.chainId)) {
    return true;
  }

  // Return immediately which should skip the popup.
  const simulationsOn = await extensionStore.get(SIMULATIONS_ON);
  if (simulationsOn !== undefined && !simulationsOn) {
    return true;
  }

  const hyperdrive = await extensionStore.get(SKIP_MARKETPLACES);
  if (hyperdrive && data.method === "eth_sendTransaction") {
    const address = data.params?.[0]?.to?.toLowerCase();
    if (KNOWN_MARKETPLACES.includes(address)) {
      return true;
    }
  }

  return false;
};
