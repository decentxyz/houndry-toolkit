import { HardhatUserConfig } from "hardhat/config";
import { configDotenv } from "dotenv";
import "./tasks/forks";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
};

configDotenv();

export default config;
