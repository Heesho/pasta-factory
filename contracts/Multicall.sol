// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPastaPlugin {
    struct Pasta {
        address account;
        string message;
    }
    function getGauge() external view returns (address);
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

contract Multicall {

    address public immutable plugin;
    address public immutable oBERO;

    struct GaugeState {
        uint256 rewardPerToken;
        uint256 totalSupply;
        uint256 balance;
        uint256 earned;
        uint256 oBeroBalance;
    }

    constructor(address _plugin, address _oBERO) {
        plugin = _plugin;
        oBERO = _oBERO;
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