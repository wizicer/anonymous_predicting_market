import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying contracts...");

  // Deploy verifiers for local development
  const BetVerifier = await ethers.getContractFactory("BetVerifier");
  const betVerifier = await BetVerifier.deploy();
  await betVerifier.waitForDeployment();
  const betVerifierAddress = await betVerifier.getAddress();
  console.log("BetVerifier deployed to:", betVerifierAddress);

  const BatchOpenVerifier = await ethers.getContractFactory("BatchOpenVerifier");
  const batchOpenVerifier = await BatchOpenVerifier.deploy();
  await batchOpenVerifier.waitForDeployment();
  const batchOpenVerifierAddress = await batchOpenVerifier.getAddress();
  console.log("BatchOpenVerifier deployed to:", batchOpenVerifierAddress);

  // Deploy main contract
  const AnonymousPredictionMarket = await ethers.getContractFactory("AnonymousPredictionMarket");
  const market = await AnonymousPredictionMarket.deploy(betVerifierAddress, batchOpenVerifierAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("AnonymousPredictionMarket deployed to:", marketAddress);

  // Save deployment addresses for UI
  const deployment = {
    betVerifier: betVerifierAddress,
    batchOpenVerifier: batchOpenVerifierAddress,
    predictionMarket: marketAddress,
    chainId: 31337,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../ui/src/contracts/deployment.json");
  const deploymentDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
