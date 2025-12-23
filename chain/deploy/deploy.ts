import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFactory = await deploy("BattleshipFactory", {
    from: deployer,
    log: true,
  });

  console.log(`BattleshipFactory contract: `, deployedFactory.address);
};
export default func;
func.id = "deploy_battleshipFactory"; // id required to prevent reexecution
func.tags = ["BattleshipFactory"];
