import {
  chainIdLookup,
  dumpJson,
  getRpc,
  killProcess,
  Lookup,
  processExists,
  startCmd,
} from "./util";
import { task } from "hardhat/config";
import { readJsonIfExists } from "./file";
import { exec } from "shelljs";

const GLUE_CONFIG = "glueConfig.json";

const name = "houndry-toolkit";
const path = __dirname.substring(0, __dirname.lastIndexOf(name));
const GLUE_CMD = `${path}/${name}/node_modules/.bin/forknet-glue`;

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
    const _loaded = (await readJsonIfExists<PidFile>(FORKS_FILE)) || {};
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

const saveForks = async () => dumpJson(FORKS_FILE, await getForks());

const getNewFork = async ({
  chain,
  port,
}: {
  chain: string;
  port?: number;
}): Promise<ForkInfo> => {
  port = port !== undefined ? Number(port) : port;
  const rpc = getRpc(chain);
  const forks = await getForks();

  if (forks?.[chain]) {
    console.log(`${chain} fork already exists`);
    process.exit(1);
  }

  const ports = new Set(Object.values(forks || {}).map((info) => info?.port));

  let nextPort = port === undefined ? 8545 : port;
  while (ports.has(nextPort)) {
    nextPort += 1;
  }

  const pid = startCmd(`anvil -p ${nextPort} -f ${rpc}`);

  const fork = {
    chain,
    pid,
    port: nextPort,
  };

  console.log(`started new fork at :${JSON.stringify(fork, null, 2)}`);
  return fork;
};

const startSingleFork = async ({
  chain,
  port,
}: {
  chain: string;
  port?: number;
}) => {
  port = port !== undefined ? Number(port) : port;
  const forks = await getForks();
  forks[chain] = await getNewFork({ chain, port });
  await saveAndStartGlue();
};

export const saveAndStartGlue = async () => {
  await dumpGlueConfig();
  await kickOffGlueService();
  await saveForks();
};

export const kickOffGlueService = async () => {
  await stopGlueService();
  startCmd(GLUE_CMD);
};

export const stopGlueService = async () => {
  exec(`pkill -f arshankhanifar/forknet-glue`);
};

export const dumpGlueConfig = async () => {
  const forks = await getForks();
  const glueConfig = {
    chains: Object.values(forks).map((fork) => {
      if (!fork) {
        throw Error("fork undfined? ");
      }
      const chainId = chainIdLookup[fork.chain];
      if (!chainId) {
        throw Error(`no chainid? ${fork.chain}`);
      }
      return {
        id: chainId,
        rpc: `http://127.0.0.1:${fork.port}`,
      };
    }),
  };

  await dumpJson(GLUE_CONFIG, glueConfig);
};

task<{ chain: string; port?: number }>(
  "start-fork",
  "starts a fork of a chain",
  startSingleFork,
)
  .addOptionalParam("chain", "chain alias", "ethereum")
  .addOptionalParam<number>("port", "port to start on");

task<{ chains: string }>(
  "start-forks",
  "starts forks of multiple chains",
  async ({ chains }) => {
    const forks = await getForks();
    for (const chain of chains.split(",")) {
      forks[chain] = await getNewFork({ chain });
    }
    await saveAndStartGlue();
  },
).addParam("chains", "comma-separated list of chains");

task("start-glue", "starts the glue service", async ({ chains }) => {
  await getForks();
  await saveAndStartGlue();
});

task("stop-glue", "starts the glue service", async ({ chains }) => {
  await stopGlueService();
});

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
  await stopGlueService();
});

task<{ chain: string }>("stop-fork", " ", async ({ chain }) => {
  await getForks();
  const pid = RUNNING_FORKS[chain]?.pid;

  if (!pid) {
    console.log(`no pid found: ${chain}`);
    return;
  }

  killProcess(pid);
  delete RUNNING_FORKS[chain];
  await saveForks();
}).addParam("chain", "chain alias");
