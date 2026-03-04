// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import {DustPoolV2} from "../src/DustPoolV2.sol";
import {IFFLONKVerifier} from "../src/IFFLONKVerifier.sol";
import {IFFLONKSplitVerifier} from "../src/IFFLONKSplitVerifier.sol";

contract MockVerifierWL is IFFLONKVerifier {
    function verifyProof(bytes32[24] calldata, uint256[9] calldata) external pure returns (bool) {
        return true;
    }
}

contract MockSplitVerifierWL is IFFLONKSplitVerifier {
    function verifyProof(bytes32[24] calldata, uint256[15] calldata) external pure returns (bool) {
        return true;
    }
}

contract MockERC20WL {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract DustPoolV2WhitelistTest is Test {
    DustPoolV2 public pool;
    MockERC20WL public token;

    address deployer = makeAddr("deployer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    event WhitelistUpdated(bool enabled);
    event AssetAllowed(address indexed asset, bool allowed);

    function setUp() public {
        vm.startPrank(deployer);
        MockVerifierWL verifier = new MockVerifierWL();
        MockSplitVerifierWL splitVerifier = new MockSplitVerifierWL();
        pool = new DustPoolV2(address(verifier), address(splitVerifier), address(0));
        vm.stopPrank();

        token = new MockERC20WL();
        vm.deal(alice, 100 ether);
    }

    // ========== Default State ==========

    function testWhitelistDisabledByDefault() public view {
        assertFalse(pool.whitelistEnabled());
    }

    function testEthAllowedByDefault() public view {
        assertTrue(pool.allowedAssets(address(0)));
    }

    // ========== Deposits with whitelist disabled ==========

    function testDepositETH_WhitelistDisabled() public {
        bytes32 commitment = bytes32(uint256(0x1));
        vm.prank(alice);
        pool.deposit{value: 1 ether}(commitment);
        assertEq(pool.depositQueueTail(), 1);
    }

    function testDepositERC20_WhitelistDisabled() public {
        bytes32 commitment = bytes32(uint256(0x2));
        uint256 amount = 1e18;

        token.mint(alice, amount);
        vm.prank(alice);
        token.approve(address(pool), amount);

        vm.prank(alice);
        pool.depositERC20(commitment, address(token), amount);
        assertEq(pool.depositQueueTail(), 1);
    }

    function testBatchDeposit_WhitelistDisabled() public {
        bytes32[] memory commitments = new bytes32[](2);
        commitments[0] = bytes32(uint256(0x3));
        commitments[1] = bytes32(uint256(0x4));

        vm.prank(alice);
        pool.batchDeposit{value: 2 ether}(commitments);
        assertEq(pool.depositQueueTail(), 2);
    }

    // ========== Deposits with whitelist enabled — allowed asset ==========

    function testDepositERC20_WhitelistEnabled_AllowedAsset() public {
        vm.startPrank(deployer);
        pool.setWhitelistEnabled(true);
        pool.setAllowedAsset(address(token), true);
        vm.stopPrank();

        bytes32 commitment = bytes32(uint256(0x5));
        uint256 amount = 1e18;

        token.mint(alice, amount);
        vm.prank(alice);
        token.approve(address(pool), amount);

        vm.prank(alice);
        pool.depositERC20(commitment, address(token), amount);
        assertEq(pool.depositQueueTail(), 1);
    }

    // ========== Deposits with whitelist enabled — non-allowed asset reverts ==========

    function testDepositERC20_WhitelistEnabled_NonAllowedAsset_Reverts() public {
        vm.prank(deployer);
        pool.setWhitelistEnabled(true);

        bytes32 commitment = bytes32(uint256(0x6));
        uint256 amount = 1e18;

        token.mint(alice, amount);
        vm.prank(alice);
        token.approve(address(pool), amount);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DustPoolV2.AssetNotAllowed.selector, address(token)));
        pool.depositERC20(commitment, address(token), amount);
    }

    // ========== ETH always allowed ==========

    function testDepositETH_WhitelistEnabled_AlwaysAllowed() public {
        vm.prank(deployer);
        pool.setWhitelistEnabled(true);

        bytes32 commitment = bytes32(uint256(0x7));
        vm.prank(alice);
        pool.deposit{value: 1 ether}(commitment);
        assertEq(pool.depositQueueTail(), 1);
    }

    function testBatchDeposit_WhitelistEnabled_ETHAlwaysAllowed() public {
        vm.prank(deployer);
        pool.setWhitelistEnabled(true);

        bytes32[] memory commitments = new bytes32[](2);
        commitments[0] = bytes32(uint256(0x8));
        commitments[1] = bytes32(uint256(0x9));

        vm.prank(alice);
        pool.batchDeposit{value: 2 ether}(commitments);
        assertEq(pool.depositQueueTail(), 2);
    }

    // ========== Access control ==========

    function testSetWhitelistEnabled_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(DustPoolV2.NotOwner.selector);
        pool.setWhitelistEnabled(true);
    }

    function testSetAllowedAsset_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(DustPoolV2.NotOwner.selector);
        pool.setAllowedAsset(address(token), true);
    }

    function testSetWhitelistEnabled_OwnerSucceeds() public {
        vm.prank(deployer);
        pool.setWhitelistEnabled(true);
        assertTrue(pool.whitelistEnabled());
    }

    function testSetAllowedAsset_OwnerSucceeds() public {
        vm.prank(deployer);
        pool.setAllowedAsset(address(token), true);
        assertTrue(pool.allowedAssets(address(token)));
    }

    // ========== Events ==========

    function testSetWhitelistEnabled_EmitsEvent() public {
        vm.prank(deployer);
        vm.expectEmit(false, false, false, true);
        emit WhitelistUpdated(true);
        pool.setWhitelistEnabled(true);
    }

    function testSetAllowedAsset_EmitsEvent() public {
        vm.prank(deployer);
        vm.expectEmit(true, false, false, true);
        emit AssetAllowed(address(token), true);
        pool.setAllowedAsset(address(token), true);
    }

    // ========== Toggle behavior ==========

    function testWhitelistDisabledAfterToggle_AllowsAnyAsset() public {
        vm.startPrank(deployer);
        pool.setWhitelistEnabled(true);
        pool.setWhitelistEnabled(false);
        vm.stopPrank();

        bytes32 commitment = bytes32(uint256(0xa));
        uint256 amount = 1e18;

        token.mint(alice, amount);
        vm.prank(alice);
        token.approve(address(pool), amount);

        vm.prank(alice);
        pool.depositERC20(commitment, address(token), amount);
        assertEq(pool.depositQueueTail(), 1);
    }

    function testRemoveAllowedAsset_ThenRevert() public {
        vm.startPrank(deployer);
        pool.setWhitelistEnabled(true);
        pool.setAllowedAsset(address(token), true);
        pool.setAllowedAsset(address(token), false);
        vm.stopPrank();

        bytes32 commitment = bytes32(uint256(0xb));
        uint256 amount = 1e18;

        token.mint(alice, amount);
        vm.prank(alice);
        token.approve(address(pool), amount);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DustPoolV2.AssetNotAllowed.selector, address(token)));
        pool.depositERC20(commitment, address(token), amount);
    }

    // ========== Fuzz tests ==========

    function testFuzz_NonAllowedAsset_Reverts(address randomAsset) public {
        // Skip address(0) since ETH is always allowed
        vm.assume(randomAsset != address(0));
        // Skip precompiles and the token (which has code and could interfere)
        vm.assume(randomAsset > address(0x10));

        vm.prank(deployer);
        pool.setWhitelistEnabled(true);

        // randomAsset is not in allowedAssets, so depositERC20 should revert
        // We need a valid ERC20 at the address, so we use etch to deploy code
        MockERC20WL fuzzToken = new MockERC20WL();
        vm.etch(randomAsset, address(fuzzToken).code);

        uint256 amount = 1e18;
        // Mint and approve through the etched contract
        MockERC20WL(randomAsset).mint(alice, amount);
        vm.prank(alice);
        MockERC20WL(randomAsset).approve(address(pool), amount);

        bytes32 commitment = bytes32(uint256(uint160(randomAsset)));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DustPoolV2.AssetNotAllowed.selector, randomAsset));
        pool.depositERC20(commitment, randomAsset, amount);
    }

    function testFuzz_AllowedAsset_Succeeds(address randomAsset) public {
        vm.assume(randomAsset != address(0));
        vm.assume(randomAsset > address(0x10));

        vm.startPrank(deployer);
        pool.setWhitelistEnabled(true);
        pool.setAllowedAsset(randomAsset, true);
        vm.stopPrank();

        MockERC20WL fuzzToken = new MockERC20WL();
        vm.etch(randomAsset, address(fuzzToken).code);

        uint256 amount = 1e18;
        MockERC20WL(randomAsset).mint(alice, amount);
        vm.prank(alice);
        MockERC20WL(randomAsset).approve(address(pool), amount);

        bytes32 commitment = bytes32(uint256(uint160(randomAsset)));

        vm.prank(alice);
        pool.depositERC20(commitment, randomAsset, amount);
        assertEq(pool.depositQueueTail(), 1);
    }
}
