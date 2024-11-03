const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const pointOne = convert("0.1", 18);
const one = convert("1", 18);

let owner, treasury, user0, user1, user2, user3;
let base, voter, vaultFactory;
let plugin, multicall;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, user0, user1, user2, user3] = await ethers.getSigners();

    const baseArtifact = await ethers.getContractFactory("Base");
    base = await baseArtifact.deploy();
    console.log("- Base Initialized");

    const vaultFactoryArtifact = await ethers.getContractFactory(
      "BerachainRewardsVaultFactory"
    );
    vaultFactory = await vaultFactoryArtifact.deploy();
    console.log("- Vault Factory Initialized");

    const voterArtifact = await ethers.getContractFactory("Voter");
    voter = await voterArtifact.deploy();
    console.log("- Voter Initialized");

    const pluginArtifact = await ethers.getContractFactory("PastaPlugin");
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      treasury.address,
      vaultFactory.address
    );
    console.log("- Plugin Initialized");

    await voter.setPlugin(plugin.address);
    console.log("- System set up");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      base.address,
      plugin.address,
      voter.address,
      await voter.OTOKEN()
    );
    console.log("- Multicall Initialized");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 tries to copy pasta that doesnt exist", async function () {
    console.log("******************************************************");
    await expect(
      multicall.connect(user0).copyPasta(user0.address, { value: pointZeroOne })
    ).to.be.revertedWith("Plugin__InvalidPasta");
  });

  it("User0 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User1 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user1)
      .createPasta(user1.address, "Henlo World from user1", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User2 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user2)
      .createPasta(user2.address, "Henlo World from user2", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user1.address, "Henlo World from user1", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User2 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user2)
      .createPasta(user2.address, "Henlo World from user2", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User0 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User1 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user1)
      .createPasta(user1.address, "Henlo World from user1", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User2 creates new pasta", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user2)
      .createPasta(user2.address, "Henlo World from user2", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user1.address, "Henlo World from user1", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user0)
      .createPasta(user0.address, "Henlo World from user0", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User2 creates new pasta for user1", async function () {
    console.log("******************************************************");
    let price = await multicall.getCreatePrice();
    console.log("Price: ", divDec(price));
    await multicall
      .connect(user2)
      .createPasta(user2.address, "Henlo World from user2", 1827464427, price, {
        value: price,
      });
    console.log("Pasta created");
    price = await plugin.getCreatePrice();
    console.log("Price: ", divDec(price));
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("User0 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user0)
      .copyPasta(user0.address, { value: pointZeroOne });
  });

  it("User1 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user1)
      .copyPasta(user1.address, { value: pointZeroOne });
  });

  it("User2 copies pasta", async function () {
    console.log("******************************************************");
    await multicall
      .connect(user2)
      .copyPasta(user2.address, { value: pointZeroOne });
  });

  it("get queue", async function () {
    console.log("******************************************************");
    const queue = await multicall.getQueue();
    console.log("Queue: ", queue);
  });

  it("get queue sizes", async function () {
    console.log("******************************************************");
    console.log("Queue Size: ", await plugin.getQueueSize());
    console.log("Creator Queue Size: ", await plugin.getCreatorQueueSize());
  });

  it("multicall testing", async function () {
    console.log("******************************************************");
    console.log(await multicall.getGauge(user0.address));
    console.log(await multicall.getGauge(user1.address));
    console.log(await multicall.getGauge(user2.address));
  });
});
