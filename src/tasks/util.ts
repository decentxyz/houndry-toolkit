import { openSync, writeFile } from "fs";
import { spawn } from "child_process";
import { exec } from "shelljs";

export enum ChainId {
  ETHEREUM = 1,
  SEPOLIA = 11155111,
  GOERLI = 5,
  OPTIMISM = 10,
  OPTIMISM_TESTNET = 420,
  POLYGON = 137,
  POLYGON_TESTNET = 80001,
  ARBITRUM = 42161,
  ARBITRUM_TESTNET = 421613,
  BASE = 8453,
  ZORA = 7777777,
  ZORA_GOERLI = 999,
  BASE_TESTNET = 84531,
  MOONBEAM = 1284,
  MOONBEAM_TESTNET = 1287,
  AVALANCHE = 43114,
  AVALANCHE_TESTNET = 43113,
  FANTOM = 250,
  FANTOM_TESTNET = 4002,
  SOLANA_DEVNET = 69420,
  SOLANA_MAINNET = 1399811149,
}

export const chainIdLookup: Lookup<string, ChainId> = {
  ethereum: ChainId.ETHEREUM,
  sepolia: ChainId.SEPOLIA,
  goerli: ChainId.GOERLI,
  optimism: ChainId.OPTIMISM,
  optimismTestnet: ChainId.OPTIMISM_TESTNET,
  polygon: ChainId.POLYGON,
  polygonTestnet: ChainId.POLYGON_TESTNET,
  arbitrum: ChainId.ARBITRUM,
  arbitrumTestnet: ChainId.ARBITRUM_TESTNET,
  base: ChainId.BASE,
  zora: ChainId.ZORA,
  zoraGoerli: ChainId.ZORA_GOERLI,
  baseTestnet: ChainId.BASE_TESTNET,
  moonbeam: ChainId.MOONBEAM,
  moonbeamTestnet: ChainId.MOONBEAM_TESTNET,
  avalanche: ChainId.AVALANCHE,
  avalancheTestnet: ChainId.AVALANCHE_TESTNET,
  fantom: ChainId.FANTOM,
  fantomTestnet: ChainId.FANTOM_TESTNET,
  solanaDevnet: ChainId.SOLANA_DEVNET,
  solana: ChainId.SOLANA_MAINNET,
};

export type Lookup<A extends string | number | symbol, B> = {
  [key in A]?: B;
};

export const getRpc = (chain: string) => {
  const rpc = process.env[`${chain.toUpperCase()}_RPC`];
  if (!rpc) {
    throw Error(`no rpc found: ${chain}`);
  }
  return rpc;
};

export function processExists(pidToCheck: number): boolean {
  try {
    process.kill(pidToCheck, 0);
    return true;
  } catch (err: any) {
    if (err.code === "EPERM") {
      return false;
    } else if (err.code === "ESRCH") {
      return false;
    } else {
      console.error(
        `Error checking process with PID ${pidToCheck}: ${err.message}`,
      );
    }
    return false;
  }
}

export const dumpJson = async (file: string, content: any) => {
  await new Promise<void>((resolve) => {
    writeFile(file, JSON.stringify(content, null, 2), () => {
      resolve();
    });
  });
};

export const startCmd = (cmd: string, file: string) => {
  console.log(`running command: ${cmd}`);
  const output = openSync(file, "a");
  const [command, ...args] = cmd.split(/\s+/);
  const child = spawn(
    command,
    args.filter((param) => Boolean(param)),
    {
      stdio: ["ignore", output, output],
      detached: true,
    },
  );
  const { pid } = child;
  if (!pid) {
    throw Error(`no pid for ${cmd}`);
  }
  child.unref();
  return pid;
};

export const killAll = (pid: number) => exec(`pkill -f anvil ; pkill -f glue`);

export const killProcess = (pid: number) => exec(`kill -9 ${pid}`);

export const killIfExists = (pid: number | undefined) => {
  if (!pid) {
    return;
  }
  if (processExists(pid)) {
    killProcess(pid);
  }
};
