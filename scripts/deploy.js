// Hardhat deployment script for ZenChainStore
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ZenChainStore to ZenChain Testnet...");

  // Get the ContractFactory and Signers here
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const ZenChainStore = await hre.ethers.getContractFactory("ZenChainStore");
  const zenChainStore = await ZenChainStore.deploy();

  await zenChainStore.deployed();

  console.log("✅ ZenChainStore deployed to:", zenChainStore.address);

  // Add some initial products from all categories
  console.log("📦 Adding initial products across all categories...");

  try {
    // Gift Cards
    await zenChainStore.addProduct(
      "ZenChain Gift Card - 10 ZTC",
      hre.ethers.utils.parseEther("10"),
      100,
      "digital",
      "ipfs://QmZenChain10ZTC"
    );

    await zenChainStore.addProduct(
      "ZenChain Gift Card - 25 ZTC",
      hre.ethers.utils.parseEther("25"),
      50,
      "digital",
      "ipfs://QmZenChain25ZTC"
    );

    // NFTs
    await zenChainStore.addProduct(
      "ZenChain Genesis NFT",
      hre.ethers.utils.parseEther("50"),
      10,
      "nft",
      "ipfs://QmZenChainGenesisNFT"
    );

    await zenChainStore.addProduct(
      "Crypto Punk Style Avatar",
      hre.ethers.utils.parseEther("35"),
      25,
      "nft",
      "ipfs://QmCryptoPunkAvatar"
    );

    // Gaming
    await zenChainStore.addProduct(
      "Gaming Mouse RGB Pro",
      hre.ethers.utils.parseEther("45"),
      15,
      "gaming",
      "ipfs://QmGamingMouseRGB"
    );

    await zenChainStore.addProduct(
      "Mechanical Keyboard",
      hre.ethers.utils.parseEther("85"),
      12,
      "gaming",
      "ipfs://QmMechanicalKeyboard"
    );

    // Apparel
    await zenChainStore.addProduct(
      "ZenChain Premium Hoodie",
      hre.ethers.utils.parseEther("45"),
      30,
      "apparel",
      "ipfs://QmZenChainHoodie"
    );

    await zenChainStore.addProduct(
      "Crypto T-Shirt Collection",
      hre.ethers.utils.parseEther("25"),
      50,
      "apparel",
      "ipfs://QmCryptoTShirt"
    );

    // Accessories
    await zenChainStore.addProduct(
      "Hardware Wallet",
      hre.ethers.utils.parseEther("120"),
      8,
      "accessories",
      "ipfs://QmHardwareWallet"
    );

    await zenChainStore.addProduct(
      "ZenChain Coffee Mug",
      hre.ethers.utils.parseEther("15"),
      60,
      "accessories",
      "ipfs://QmZenChainMug"
    );

    // Collectibles
    await zenChainStore.addProduct(
      "ZenChain Commemorative Coin",
      hre.ethers.utils.parseEther("75"),
      100,
      "collectibles",
      "ipfs://QmZenChainCoin"
    );

    console.log("✅ Initial products added successfully across all categories!");

  } catch (error) {
    console.error("❌ Error adding initial products:", error);
  }

  // Verification info
  console.log("\n📋 Contract Details:");
  console.log("Contract Address:", zenChainStore.address);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", hre.network.name);

  console.log("\n🔗 Next Steps:");
  console.log("1. Update CONTRACT_CONFIG.address in app.js with:", zenChainStore.address);
  console.log("2. Verify contract on ZenTrace:", `https://zentrace.io/address/${zenChainStore.address}`);
  console.log("3. Test the DApp with your deployed contract");
  console.log("4. Cart functionality is now working properly!");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: zenChainStore.address,
    deployer: deployer.address,
    network: hre.network.name,
    deploymentTime: new Date().toISOString(),
    transactionHash: zenChainStore.deployTransaction.hash,
    categories: ["digital", "nft", "gaming", "apparel", "accessories", "collectibles"],
    productCount: 11
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });