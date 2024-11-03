// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGauge {
    function _deposit(address account, uint256 amount) external;
    function _withdraw(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
}

interface IVoter {
    function OTOKEN() external view returns (address);
}

interface IWBERA {
    function deposit() external payable;
}

interface IBerachainRewardsVaultFactory {
    function createRewardsVault(address _vaultToken) external returns (address);
}

interface IRewardVault {
    function delegateStake(address account, uint256 amount) external;
    function delegateWithdraw(address account, uint256 amount) external;
}

contract VaultToken is ERC20, Ownable {
    constructor() ERC20("Bull Ish Vault Token", "BIVT") {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

contract PastaPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant QUEUE_SIZE = 100;
    uint256 public constant DURATION = 7 days;
    uint256 public constant MESSAGE_LENGTH = 420;
    uint256 public constant AMOUNT = 1;

    uint256 constant public PRECISION = 1e18;
    uint256 public constant AUCTION_DURATION = 3600; // 1 hour
    uint256 constant public ABS_MAX_INIT_PRICE = type(uint192).max;
    uint256 constant public PRICE_MULTIPLIER = 2000000000000000000;
    
    string public constant PROTOCOL = "Gumball";
    string public constant NAME = "PastaFactory";

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20 private immutable token;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;

    address[] private assetTokens;
    address[] private bribeTokens;

    address public immutable vaultToken;
    address public immutable rewardVault;

    address public treasury;
    uint256 public copyPrice = 0.01 ether;
    uint256 public minCreatePrice = 0.01 ether;
    uint256 public auctionCreatePrice;
    uint256 public auctionStartTime;

    struct Pasta {
        address account;
        string message;
    }

    Pasta currentPasta;

    mapping(uint256 => Pasta) public queue;
    uint256 public head = 0;
    uint256 public tail = 0;
    uint256 public count = 0;

    mapping(uint256 => address) public creatorQueue;
    uint256 public creatorHead = 0;
    uint256 public creatorTail = 0;
    uint256 public creatorCount = 0;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__NotAuthorizedVoter();
    error Plugin__NotAuthorized();
    error Plugin__InvalidMessage();
    error Plugin__InvalidAccount();
    error Plugin__InvalidPasta();
    error Plugin__MaxPaymentExceeded();
    error Plugin__DeadlinePassed();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__ClaimedAnDistributed();
    event Plugin__PastaAdded(address author, string message);
    event Plugin__PastaRemoved(address author, string message);
    event Plugin__CreatorAdded(address creator);
    event Plugin__CreatorRemoved(address creator);
    event Plugin__TreasurySet(address treasury);
    event Plugin__CopyPriceSet(uint256 fee);


    /*----------  MODIFIERS  --------------------------------------------*/

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _token,                
        address _voter, 
        address[] memory _assetTokens,
        address[] memory _bribeTokens,
        address _treasury,
        address _vaultFactory
    ) {
        token = IERC20(_token);
        voter = _voter;
        assetTokens = _assetTokens;
        bribeTokens = _bribeTokens;
        treasury = _treasury;
        OTOKEN = IVoter(_voter).OTOKEN();

        auctionCreatePrice = minCreatePrice;
        auctionStartTime = block.timestamp;

        vaultToken = address(new VaultToken());
        rewardVault = IBerachainRewardsVaultFactory(_vaultFactory).createRewardsVault(address(vaultToken));
    }

    function claimAndDistribute() 
        external 
        nonReentrant
    {
        uint256 balance = token.balanceOf(address(this));
        if (balance > DURATION) {
            uint256 treasuryFee = balance / 5;
            token.safeTransfer(treasury, treasuryFee);
            token.safeApprove(bribe, 0);
            token.safeApprove(bribe, balance - treasuryFee);
            IBribe(bribe).notifyRewardAmount(address(token), balance - treasuryFee);
        }
    }

    function create(address account, string memory message, uint256 deadline, uint256 maxPayment)         
        external
        nonReentrant 
        returns (uint256 paymentAmount)
    {
        if (bytes(message).length == 0) revert Plugin__InvalidMessage();
        if (bytes(message).length > MESSAGE_LENGTH) revert Plugin__InvalidMessage();
        if (account == address(0)) revert Plugin__InvalidAccount();
        if (block.timestamp > deadline) revert Plugin__DeadlinePassed();
        
        paymentAmount = getCreatePrice();
        if (paymentAmount > maxPayment) revert Plugin__MaxPaymentExceeded();

        uint256 newCreatePrice = paymentAmount * PRICE_MULTIPLIER / PRECISION;
        if (newCreatePrice > ABS_MAX_INIT_PRICE) {
            newCreatePrice = ABS_MAX_INIT_PRICE;
        }

        auctionCreatePrice = newCreatePrice;
        auctionStartTime = block.timestamp;

        currentPasta = Pasta(account, message);

        token.safeTransferFrom(msg.sender, address(this), paymentAmount);
        updateQueue(account, message);
    }

    function copy(address account)         
        external
        nonReentrant 
    {
        if (account == address(0)) revert Plugin__InvalidAccount();
        if (currentPasta.account == address(0)) revert Plugin__InvalidPasta();

        token.safeTransferFrom(msg.sender, address(this), copyPrice);
        updateCreatorQueue(currentPasta.account);
        updateQueue(account, currentPasta.message);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function updateQueue(address account, string memory message) internal {
        uint256 currentIndex = tail % QUEUE_SIZE;
        if (count == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(queue[head].account, AMOUNT);

            // Berachain Rewards Vault Delegate Stake
            IRewardVault(rewardVault).delegateWithdraw(queue[head].account, AMOUNT);
            VaultToken(vaultToken).burn(address(this), AMOUNT);

            emit Plugin__PastaRemoved(queue[head].account, queue[head].message);
            head = (head + 1) % QUEUE_SIZE;
        }
        queue[currentIndex] = Pasta(account, message);
        tail = (tail + 1) % QUEUE_SIZE;
        count = count < QUEUE_SIZE ? count + 1 : count;
        emit Plugin__PastaAdded(account, message);

        IGauge(gauge)._deposit(account, AMOUNT);

        VaultToken(vaultToken).mint(address(this), AMOUNT);
        IERC20(vaultToken).safeApprove(rewardVault, 0);
        IERC20(vaultToken).safeApprove(rewardVault, AMOUNT);
        IRewardVault(rewardVault).delegateStake(account, AMOUNT);
    }

    function updateCreatorQueue(address creator) internal {
        uint256 currentIndex = creatorTail % QUEUE_SIZE;
        if (creatorCount == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(creatorQueue[creatorHead], AMOUNT);

            // Berachain Rewards Vault Delegate Stake
            IRewardVault(rewardVault).delegateWithdraw(creatorQueue[creatorHead], AMOUNT);
            VaultToken(vaultToken).burn(address(this), AMOUNT);

            emit Plugin__CreatorRemoved(creatorQueue[creatorHead]);
            creatorHead = (creatorHead + 1) % QUEUE_SIZE;
        }
        creatorQueue[currentIndex] = creator;
        creatorTail = (creatorTail + 1) % QUEUE_SIZE;
        creatorCount = creatorCount < QUEUE_SIZE ? creatorCount + 1 : creatorCount;
        emit Plugin__CreatorAdded(creator);

        IGauge(gauge)._deposit(creator, AMOUNT);

        VaultToken(vaultToken).mint(address(this), AMOUNT);
        IERC20(vaultToken).safeApprove(rewardVault, 0);
        IERC20(vaultToken).safeApprove(rewardVault, AMOUNT);
        IRewardVault(rewardVault).delegateStake(creator, AMOUNT);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit Plugin__TreasurySet(_treasury);
    }

    function setCopyPrice(uint256 _copyPrice) external onlyOwner {
        copyPrice = _copyPrice;
        emit Plugin__CopyPriceSet(_copyPrice);
    }

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getCreatePrice() public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - auctionStartTime;
        if (timeElapsed > AUCTION_DURATION) {
            return minCreatePrice;
        }
        uint256 price = auctionCreatePrice - (auctionCreatePrice * timeElapsed / AUCTION_DURATION);
        if (price < minCreatePrice) {
            return minCreatePrice;
        }
        return price;
    }

    function balanceOf(address account) public view returns (uint256) {
        return IGauge(gauge).balanceOf(account);
    }

    function totalSupply() public view returns (uint256) {
        return IGauge(gauge).totalSupply();
    }

    function getToken() public view returns (address) {
        return address(token);
    } 

    function getProtocol() public view virtual returns (string memory) {
        return PROTOCOL;
    }

    function getName() public view virtual returns (string memory) {
        return NAME;
    }

    function getVoter() public view returns (address) {
        return voter;
    }

    function getGauge() public view returns (address) {
        return gauge;
    }

    function getBribe() public view returns (address) {
        return bribe;
    }

    function getAssetTokens() public view returns (address[] memory) {
        return assetTokens;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
    }

    function getVaultToken() public view returns (address) {
        return vaultToken;
    }

    function getRewardVault() public view returns (address) {
        return rewardVault;
    }

    function getQueueSize() public view returns (uint256) {
        return count;
    }

    function getCreatorQueueSize() public view returns (uint256) {
        return creatorCount;
    }

    function getPasta(uint256 index) public view returns (Pasta memory) {
        return queue[(head + index) % QUEUE_SIZE];
    }

    function getQueueFragment(uint256 start, uint256 end) public view returns (Pasta[] memory) {
        Pasta[] memory result = new Pasta[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = queue[(head + i) % QUEUE_SIZE];
        }
        return result;
    }

    function getCreatorQueueFragment(uint256 start, uint256 end) public view returns (address[] memory) {
        address[] memory result = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = creatorQueue[i];
        }
        return result;
    }   

    function getQueue() public view returns (Pasta[] memory) {
        Pasta[] memory result = new Pasta[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = queue[(head + i) % QUEUE_SIZE];
        }
        return result;
    }

    function getCreatorQueue() public view returns (address[] memory) {
        address[] memory result = new address[](creatorCount);
        for (uint256 i = 0; i < creatorCount; i++) {
            result[i] = creatorQueue[i];
        }
        return result;
    }

}