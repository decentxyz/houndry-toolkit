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
