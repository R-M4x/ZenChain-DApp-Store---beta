const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZenChainStore", function () {
  let zenChainStore;
  let owner;
  let buyer;

  beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    const ZenChainStore = await ethers.getContractFactory("ZenChainStore");
    zenChainStore = await ZenChainStore.deploy();
    await zenChainStore.deployed();
  });

  it("Should deploy successfully", async function () {
    expect(zenChainStore.address).to.be.properAddress;
  });

  it("Should set the correct owner", async function () {
    expect(await zenChainStore.owner()).to.equal(owner.address);
  });

  it("Should allow owner to add products in different categories", async function () {
    // Add products from different categories
    await zenChainStore.addProduct(
      "Gift Card",
      ethers.utils.parseEther("10"),
      100,
      "digital",
      "ipfs://test"
    );

    await zenChainStore.addProduct(
      "NFT Item",
      ethers.utils.parseEther("25"),
      50,
      "nft",
      "ipfs://test-nft"
    );

    await zenChainStore.addProduct(
      "Gaming Mouse",
      ethers.utils.parseEther("45"),
      20,
      "gaming",
      "ipfs://test-gaming"
    );

    const products = await zenChainStore.getActiveProducts();
    expect(products.length).to.equal(3);
    expect(products[0].name).to.equal("Gift Card");
    expect(products[0].category).to.equal("digital");
    expect(products[1].category).to.equal("nft");
    expect(products[2].category).to.equal("gaming");
  });

  it("Should allow users to purchase products", async function () {
    // Add a product
    await zenChainStore.addProduct(
      "Test Product",
      ethers.utils.parseEther("10"),
      100,
      "accessories",
      "ipfs://test"
    );

    // Purchase the product
    await zenChainStore.connect(buyer).purchaseWithZTC(1, 2, {
      value: ethers.utils.parseEther("20")
    });

    // Check if stock decreased
    const product = await zenChainStore.getProduct(1);
    expect(product.stock).to.equal(98);
  });

  it("Should track user purchases", async function () {
    // Add a product
    await zenChainStore.addProduct(
      "Collectible Item",
      ethers.utils.parseEther("75"),
      10,
      "collectibles",
      "ipfs://collectible"
    );

    // Make purchase
    await zenChainStore.connect(buyer).purchaseWithZTC(1, 1, {
      value: ethers.utils.parseEther("75")
    });

    // Check user purchases
    const userPurchases = await zenChainStore.getUserPurchases(buyer.address);
    expect(userPurchases.length).to.equal(1);
  });
});