import { readFile, writeFile } from "fs";
import { exec } from "shelljs";
import { spawn } from "child_process";
import { getRpc, Lookup, processExists } from "./util";
import { task } from "hardhat/config";

type ForkInfo = {
  chain: string;
  port: number;
  pid: number;
};

type PidFile = Lookup<string, ForkInfo>;

const RUNNING_FORKS: PidFile = {};

const FORKS_FILE = "runningForks.json";
const getForks = async (): Promise<PidFile> => {
  if (Object.keys(RUNNING_FORKS).length === 0) {
    const _loaded = await new Promise<PidFile>((resolve, reject) => {
      readFile(FORKS_FILE, "utf-8", (err, data) => {
        if (err || !data) {
          resolve({});
          return;
        }
        const forkFile: PidFile = JSON.parse(data);
        resolve({ ...RUNNING_FORKS, ...forkFile });
      });
    });
    for (const key of Object.keys(_loaded)) {
      RUNNING_FORKS[key] = _loaded[key];
    }
  }

  for (const fork of Object.values(RUNNING_FORKS)) {
    if (!fork) {
      continue;
    }
    const { chain, pid } = fork;
    if (!processExists(pid)) {
      console.log(`fork ${chain} does not exist, removing.`);
      delete RUNNING_FORKS[fork.chain];
    }
  }

  return RUNNING_FORKS;
};

const saveForks = async () => {
  await getForks();
  await new Promise<void>((resolve) => {
    const info = JSON.stringify(RUNNING_FORKS, null, 2);
    writeFile(FORKS_FILE, info, () => {
      resolve();
    });
  });
};

const startFork = async ({ chain, port }: { chain: string; port?: string }) => {
  const rpc = getRpc(chain);
  const forks = await getForks();

  if (forks?.[chain]) {
    console.log(`${chain} fork already exists`);
    process.exit(1);
  }

  const ports = new Set(Object.values(forks || {}).map((info) => info?.port));

  let nextPort = port === undefined ? 8545 : Number(port);
  while (ports.has(nextPort)) {
    nextPort += 1;
  }

  const cmd = `anvil -p ${nextPort} -f ${rpc}`;
  console.log(`running comand; ${cmd}`);
  const [command, ...args] = cmd.split(/\s+/);
  const { pid } = spawn(command, args, { detached: true, stdio: "ignore" });

  if (!pid) {
    throw Error(`could not start fork: "${cmd}"`);
  }

  const newFork: ForkInfo = {
    chain,
    pid,
    port: nextPort,
  };

  forks[chain] = newFork;

  console.log(`started new fork at :${JSON.stringify(newFork, null, 2)}`);

  await saveForks();
};

task<{ chain: string; port?: string }>(
  "start-fork",
  "starts a fork of a chain",
  startFork,
)
  .addOptionalParam("chain", "chain alias", "ethereum")
  .addOptionalParam("port", "port to start on");

task("list-forks", "lists all running forks", async () => {
  const forks = await getForks();
  Object.values(forks).forEach((fork) => {
    if (!fork) {
      return;
    }
    const { chain, pid, port } = fork;
    console.log(`chain: ${chain} - port: ${port} - pid: ${pid}`);
  });
});

task("stop-all-forks", "lists all running forks", async (task, hre) => {
  const forks = await getForks();
  Object.values(forks).forEach((fork) => {
    if (!fork) {
      return;
    }
    hre.run("stop-fork", { chain: fork.chain });
  });
});

task<{ chain: string }>("stop-fork", " ", async ({ chain }) => {
  await getForks();
  const pid = RUNNING_FORKS[chain]?.pid;

  if (!pid) {
    console.log(`no pid found: ${chain}`);
    return;
  }

  exec(`kill -9 ${pid}`);
  delete RUNNING_FORKS[chain];
  await saveForks();
}).addParam("chain", "chain alias");
