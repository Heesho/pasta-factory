// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPastaPlugin {
    struct Pasta {
        address account;
        string message;
    }
    function create(address account, string memory message, uint256 deadline, uint256 maxPayment) external payable;
    function copy(address account) external payable;
    function getGauge() external view returns (address);
    function getCreatePrice() external view returns (uint256);
    function getCreatorQueueFragment(uint256 start, uint256 end) external view returns (address[] memory);
    function getQueueFragment(uint256 start, uint256 end) external view returns (Pasta[] memory);
    function getCreatorQueue() external view returns (address[] memory);
    function getQueue() external view returns (Pasta[] memory);
    function getCreatorQueueSize() external view returns (uint256);
    function getQueueSize() external view returns (uint256);
}

interface IGauge {
    function totalSupply() external view returns (uint256);
    function getRewardForDuration(address token) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function earned(address account, address token) external view returns (uint256);
}

interface IVoter {
    function getReward(address account) external;
}

contract Multicall {

    address public immutable plugin;
    address public immutable voter;
    address public immutable oBERO;

    struct GaugeState {
        uint256 rewardPerToken;
        uint256 totalSupply;
        uint256 balance;
        uint256 earned;
        uint256 oBeroBalance;
    }

    constructor(address _plugin, address _voter, address _oBERO) {
        plugin = _plugin;
        voter = _voter;
        oBERO = _oBERO;
    }

    function createPasta(address account, string memory message, uint256 deadline, uint256 maxPayment) external payable {
        IPastaPlugin(plugin).create{value: msg.value}(account, message, deadline, maxPayment);
    }

    function copyPasta(address account) external payable {
        IPastaPlugin(plugin).copy{value: msg.value}(account);
    }

    function getReward(address account) external {
        IVoter(voter).getReward(account);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function getCreatePrice() external view returns (uint256) {
        return IPastaPlugin(plugin).getCreatePrice();
    }

    function getGauge(address account) external view returns (GaugeState memory gaugeState) {
        address gauge = IPastaPlugin(plugin).getGauge();
        if (gauge != address(0)) {
            gaugeState.rewardPerToken = IGauge(gauge).totalSupply() == 0 ? 0 : (IGauge(gauge).getRewardForDuration(oBERO) * 1e18 / IGauge(gauge).totalSupply());
            gaugeState.totalSupply = IGauge(gauge).totalSupply();
            gaugeState.balance = IGauge(gauge).balanceOf(account);
            gaugeState.earned = IGauge(gauge).earned(account, oBERO);
            gaugeState.oBeroBalance = IERC20(oBERO).balanceOf(account);
        }
    }

    function getCreatorQueueFragment(uint256 start, uint256 end) external view returns (address[] memory) {
        return IPastaPlugin(plugin).getCreatorQueueFragment(start, end);
    }

    function getQueueFragment(uint256 start, uint256 end) external view returns (IPastaPlugin.Pasta[] memory) {
        return IPastaPlugin(plugin).getQueueFragment(start, end);
    }

    function getCreatorQueue() external view returns (address[] memory) {
        return IPastaPlugin(plugin).getCreatorQueue();
    }

    function getQueue() external view returns (IPastaPlugin.Pasta[] memory) {
        return IPastaPlugin(plugin).getQueue();
    }

    function getCreatorQueueSize() external view returns (uint256) {
        return IPastaPlugin(plugin).getCreatorQueueSize();
    }

    function getQueueSize() external view returns (uint256) {
        return IPastaPlugin(plugin).getQueueSize();
    }

}