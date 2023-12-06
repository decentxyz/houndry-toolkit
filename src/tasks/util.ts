import { writeFile } from "fs";
import { spawn } from "child_process";
import { exec } from "shelljs";

export enum ChainId {
  ETHEREUM = 1,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  ZORA = 7777777,
  BASE = 8453,
  ZORA_GOERLI = 999,
  SEPOLIA = 11155111,
}

export const chainIdLookup: Lookup<string, ChainId> = {
  ethereum: ChainId.ETHEREUM,
  arbitrum: ChainId.ARBITRUM,
  optimism: ChainId.OPTIMISM,
  zora: ChainId.ZORA,
  base: ChainId.BASE,
  zoraGoerli: ChainId.ZORA_GOERLI,
  sepolia: ChainId.SEPOLIA,
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

export const startCmd = (cmd: string) => {
  console.log(`running command: ${cmd}`);
  const [command, ...args] = cmd.split(/\s+/);
  const spawned = spawn(command, args, { detached: true, stdio: "ignore" });
  const { pid } = spawned;
  if (!pid) {
    throw Error(`no pid for ${cmd}`);
  }

  return pid;
};

export const killProcess = (pid: number) => exec(`kill -9 ${pid}`);

export const killIfExists = (pid: number | undefined) => {
  if (!pid) {
    return;
  }
  if (processExists(pid)) {
    killProcess(pid);
  }
};
