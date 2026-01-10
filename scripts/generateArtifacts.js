const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts');
const OUTPUT_FILE = path.join(__dirname, '../ui/src/contracts/artifacts.json');

function readArtifact(relativePath) {
  const fullPath = path.join(ARTIFACTS_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Artifact not found: ${fullPath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(content);
}

function main() {
  console.log('Generating deployment artifacts...');

  try {
    // Read contract artifacts
    const betVerifier = readArtifact('generated/BetVerifier.sol/BetVerifier.json');
    const batchOpenVerifier = readArtifact('generated/BatchOpenVerifier.sol/BatchOpenVerifier.json');
    const anonymousPredictionMarket = readArtifact('prediction.sol/AnonymousPredictionMarket.json');

    // Create output object with only necessary data
    const output = {
      BetVerifier: {
        abi: betVerifier.abi,
        bytecode: betVerifier.bytecode
      },
      BatchOpenVerifier: {
        abi: batchOpenVerifier.abi,
        bytecode: batchOpenVerifier.bytecode
      },
      AnonymousPredictionMarket: {
        abi: anonymousPredictionMarket.abi,
        bytecode: anonymousPredictionMarket.bytecode
      }
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log('✓ Deployment artifacts generated successfully!');
    console.log(`  Output: ${OUTPUT_FILE}`);
    console.log(`  Contracts: BetVerifier, BatchOpenVerifier, AnonymousPredictionMarket`);
  } catch (error) {
    console.error('✗ Failed to generate deployment artifacts:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
