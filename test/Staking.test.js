const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {
  let owner, user, other;
  let staking, nft, rewardToken;

  const ONE_YEAR = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user, other] = await ethers.getSigners();

    const SyntheticToken = await ethers.getContractFactory("SyntheticToken");
    rewardToken = await SyntheticToken.deploy(
      "Reward Token",
      "RWD",
      owner.address
    );
    await rewardToken.deployed();

    await rewardToken.mint(owner.address, ethers.utils.parseEther("1000000"));

    const Wrapper = await ethers.getContractFactory("Wrapper");
    nft = await Wrapper.deploy(
      rewardToken.address,
      ethers.utils.parseEther("1")
    );
    await nft.deployed();

    await rewardToken
      .connect(owner)
      .mint(user.address, ethers.utils.parseEther("1"));
    await rewardToken
      .connect(user)
      .approve(nft.address, ethers.utils.parseEther("1"));
    await nft.connect(user).wrap();

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(nft.address, rewardToken.address);
    await staking.deployed();

    await nft.connect(user).approve(staking.address, 1);
  });

  describe("constructor", function () {
    it("reverts constructor when nft address is zero", async function () {
      const Staking = await ethers.getContractFactory("Staking");
      await expect(
        Staking.deploy(
          ethers.constants.AddressZero,
          rewardToken.address
        )
      ).to.be.reverted;
    });

    it("reverts constructor when reward token address is zero", async function () {
      const Staking = await ethers.getContractFactory("Staking");
      await expect(
        Staking.deploy(
          nft.address,
          ethers.constants.AddressZero
        )
      ).to.be.reverted;
    });
  });

  describe("stake()", function () {
    it("reverts when staking already staked NFT", async function () {
      await staking.connect(user).stake(1);
      await expect(
        staking.connect(user).stake(1)
      ).to.be.reverted;
    });
    it("reverts stake when token does not exist", async function () {
      await expect(
        staking.connect(user).stake(999)
      ).to.be.reverted;
    });
    it("reverts stake when NFT is not approved", async function () {
      await rewardToken.mint(user.address, ethers.utils.parseEther("1"));
      await rewardToken.connect(user).approve(nft.address, ethers.utils.parseEther("1"));
      await nft.connect(user).wrap();
          
      await expect(
        staking.connect(user).stake(2)
      ).to.be.reverted;
    });
  });

  describe("unstake()", function () {
    it("reverts unstake by non-staker", async function () {
      await staking.connect(user).stake(1);

      await expect(
        staking.connect(other).unstake(1)
      ).to.be.reverted;
    });

    it("reverts unstake when token is not staked by user", async function () {
      await expect(
        staking.connect(user).unstake(1)
      ).to.be.reverted;
    });

    it("covers _removeTokenId false branch when tokenId is not first", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("100")
      );

      await rewardToken.mint(user.address, ethers.utils.parseEther("1"));
      await rewardToken.connect(user).approve(nft.address, ethers.utils.parseEther("1"));
      await nft.connect(user).wrap(); // tokenId = 2

      await nft.connect(user).approve(staking.address, 1);
      await nft.connect(user).approve(staking.address, 2);

      await staking.connect(user).stake(1);
      await staking.connect(user).stake(2);

      await staking.connect(user).unstake(2);

      const remaining = await staking.stakedNFTs(user.address, 0);
      expect(remaining).to.equal(1);
    });
  });

  describe("rewards accounting", function () {
    it("accrues rewards over time and allows claim", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("100")
      );

      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await staking.connect(user).claim();

      const balance = await rewardToken.balanceOf(user.address);
      expect(balance).to.be.gt(0);
    });

    it("does not accrue rewards when user has no staked NFTs", async function () {
      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await expect(
        staking.connect(user).claim()
      ).to.be.reverted;
    });

    it("covers _updateRewards branch when staked == 0", async function () {
      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      await staking.connect(user).unstake(1);

      await expect(
        staking.connect(user).claim()
      ).to.be.reverted;
    });
  });

  describe("pendingRewards()", function () {
    it("pendingRewards returns 0 when lastClaimTimestamp == 0", async function () {
      const pending = await staking.pendingRewards(other.address);
      expect(pending).to.equal(0);
    });

    it("pendingRewards increases over time", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("100")
      );

      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR / 2]);
      await ethers.provider.send("evm_mine");

      const pending = await staking.pendingRewards(user.address);
      expect(pending).to.be.gt(0);
    });

    it("covers pendingRewards: timestamp != 0, staked > 0, no time passed", async () => {
      await staking.connect(user).stake(1);

      const data = await staking.rewards(user.address);
      expect(data.lastClaimTimestamp).to.be.gt(0);

      const pending = await staking.pendingRewards(user.address);
      expect(pending).to.equal(0);
    });
  });

  describe("canClaim()", function () {
    it("canClaim returns true when rewards are sufficient", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("100")
      );

      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      const can = await staking.canClaim(user.address);
      expect(can).to.equal(true);
    });

    it("canClaim returns true when claimable > 0 even without time passing", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("100")
      );

      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await staking.connect(user).unstake(1);

      const can = await staking.canClaim(user.address);
      expect(can).to.equal(true);
    });

    it("covers canClaim: pending > 0 but balance < pending", async function () {
      await staking.connect(user).stake(1);
    
      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");
    
      const pending = await staking.pendingRewards(user.address);
      expect(pending).to.be.gt(0);
    
      const balance = await rewardToken.balanceOf(staking.address);
      expect(balance).to.equal(0);
    
      const can = await staking.canClaim(user.address);
      expect(can).to.equal(false);
    });

    it("canClaim returns false when pending rewards are zero", async function () {
      await staking.connect(user).stake(1);
      const can = await staking.canClaim(user.address);
      expect(can).to.equal(false);
    });

    it("covers canClaim when pending > 0 and balance is exactly equal", async function () {
      await rewardToken.transfer(
        staking.address,
        ethers.utils.parseEther("1")
      );
    
      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      const pending = await staking.pendingRewards(user.address);

      const balance = await rewardToken.balanceOf(staking.address);
      await rewardToken.transfer(staking.address, pending);



      const can = await staking.canClaim(user.address);
      expect(can).to.equal(true);
    });
  });

  describe("claim()", function () {
    it("reverts claim with zero rewards", async function () {
      await staking.connect(user).stake(1);
      await expect(staking.connect(user).claim())
        .to.be.reverted;
    });

    it("reverts claim when staking contract has insufficient rewards", async function () {
      await staking.connect(user).stake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await expect(
        staking.connect(user).claim()
      ).to.be.reverted;
    });

    it("reverts claim when staked == 0 even after time passed", async function () {
      await staking.connect(user).stake(1);
      await staking.connect(user).unstake(1);

      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await expect(
        staking.connect(user).claim()
      ).to.be.reverted;
    });
  });

  describe("admin functions", function () {
    describe("setStakingRate()", function () {
      it("reverts setStakingRate when newRate is zero", async function () {
         await expect(
           staking.connect(owner).setStakingRate(0)
         ).to.be.reverted;
      });

      it("reverts setStakingRate when active stakes exist", async function () {
        await staking.connect(user).stake(1);
      
        await expect(
          staking.connect(owner).setStakingRate(1)
        ).to.be.reverted;
      });

      it("covers setStakingRate when no active stakes exist", async function () {
        const oldRate = await staking.stakingRate();
        const newRate = ethers.utils.parseEther("3");

        await staking.connect(owner).setStakingRate(newRate);

        expect(await staking.stakingRate()).to.equal(newRate);
      });


      it("setStakingRate emits event after all stakes are removed", async function () {
        await staking.connect(user).stake(1);
      
        await staking.connect(user).unstake(1);
      
        expect(await staking.totalStakedNFTs()).to.equal(0);
      
        const oldRate = await staking.stakingRate();
        const newRate = ethers.utils.parseEther("5");
      
        await expect(
          staking.connect(owner).setStakingRate(newRate)
        )
          .to.emit(staking, "StakingRateUpdated")
          .withArgs(oldRate, newRate);
      
        expect(await staking.stakingRate()).to.equal(newRate);
      });

      it("emits StakingRateUpdated with correct values", async function () {
        const oldRate = await staking.stakingRate();
        const newRate = ethers.utils.parseEther("5");

        const tx = await staking.connect(owner).setStakingRate(newRate);
        const receipt = await tx.wait();

        const event = receipt.events.find(e => e.event === "StakingRateUpdated");
        expect(event.args.oldRate).to.equal(oldRate);
        expect(event.args.newRate).to.equal(newRate);
      });

      it("covers setStakingRate onlyOwner revert", async () => {
      await expect(
        staking.connect(user).setStakingRate(1)
      ).to.be.reverted;
      });
    });
  });

  describe("ERC721 receiver", function () {
    it("onERC721Received reverts when called directly", async function () {
      await expect(
        staking.onERC721Received(
          owner.address,
          owner.address,
          1,
          "0x"
        )
      ).to.be.reverted;
    });
  });

  describe("Reentrancy / stake()", function () {
    it("covers nonReentrant in stake via ReentrantStakeERC721", async function () {
      const [owner, user] = await ethers.getSigners();

      const SyntheticToken = await ethers.getContractFactory("SyntheticToken");
      const rewardToken = await SyntheticToken.deploy(
        "Reward",
        "RWD",
        owner.address
      );
      await rewardToken.deployed();

      const ReentrantStakeERC721 = await ethers.getContractFactory(
        "ReentrantStakeERC721"
      );
      const nft = await ReentrantStakeERC721.deploy();
      await nft.deployed();

      const Staking = await ethers.getContractFactory("Staking");
      const staking = await Staking.deploy(
        nft.address,
        rewardToken.address
      );
      await staking.deployed();

      await nft.setStaking(staking.address);

      await nft.mint(user.address, 1);
      await nft.connect(user).approve(staking.address, 1);

      await expect(
        staking.connect(user).stake(1)
      ).to.be.reverted;
    });
  });

  describe("Reentrancy / unstake()", function () {
    it("covers nonReentrant in unstake via ReentrantUnstakeERC721", async function () {
      const [owner, user] = await ethers.getSigners();

      const SyntheticToken = await ethers.getContractFactory("SyntheticToken");
      const rewardToken = await SyntheticToken.deploy(
        "Reward",
        "RWD",
        owner.address
      );
      await rewardToken.deployed();

      const ReentrantUnstakeERC721 = await ethers.getContractFactory(
        "ReentrantUnstakeERC721"
      );
      const nft = await ReentrantUnstakeERC721.deploy();
      await nft.deployed();

      const Staking = await ethers.getContractFactory("Staking");
      const staking = await Staking.deploy(
        nft.address,
        rewardToken.address
      );
      await staking.deployed();

      await nft.setStaking(staking.address);

      await nft.mint(user.address, 1);
      await nft.connect(user).approve(staking.address, 1);

      await staking.connect(user).stake(1);

      await expect(
        staking.connect(user).unstake(1)
      ).to.be.reverted;
    });
  });

  describe("Reentrancy / claim()", function () {
    it("covers nonReentrant in claim via ReentrantClaimERC20", async function () {
      const [owner, user] = await ethers.getSigners();

      const ReentrantClaimERC20 = await ethers.getContractFactory(
        "ReentrantClaimERC20"
      );
      const rewardToken = await ReentrantClaimERC20.deploy();
      await rewardToken.deployed();

      const MockERC721 = await ethers.getContractFactory("MockERC721");
      const nft = await MockERC721.deploy();
      await nft.deployed();

      const Staking = await ethers.getContractFactory("Staking");
      const staking = await Staking.deploy(
        nft.address,
        rewardToken.address
      );
      await staking.deployed();

      await rewardToken.setStaking(staking.address);

      const tx = await nft.mint(user.address);
      const receipt = await tx.wait();
      const tokenId = receipt.events[0].args.tokenId;

      await nft.connect(user).approve(staking.address, tokenId);

      await staking.connect(user).stake(tokenId);

      await rewardToken.mint(
        staking.address,
        ethers.utils.parseEther("100")
      );

      const ONE_YEAR = 365 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
      await ethers.provider.send("evm_mine");

      await expect(
        staking.connect(user).claim()
      ).to.be.reverted;
    });

    it("ReentrantClaimERC20: transfer works when sender is NOT staking", async function () {
      const [owner, user] = await ethers.getSigners();
    
      const ReentrantClaimERC20 = await ethers.getContractFactory(
        "ReentrantClaimERC20"
      );
      const token = await ReentrantClaimERC20.deploy();
      await token.deployed();
    
      await token.mint(user.address, ethers.utils.parseEther("10"));
    
      await expect(
        token.connect(user).transfer(
          owner.address,
          ethers.utils.parseEther("1")
        )
      ).to.not.be.reverted;
    });
  });
});