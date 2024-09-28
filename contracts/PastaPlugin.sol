// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IGauge {
    function _deposit(address account, uint256 amount) external;
    function _withdraw(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
    function DURATION() external view returns (uint);
}

interface IVoter {
    function OTOKEN() external view returns (address);
}

interface IWBERA {
    function deposit() external payable;
}

contract PastaPlugin is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant QUEUE_SIZE = 100;
    uint256 public constant DURATION = 7 days;
    uint256 public constant MESSAGE_LENGTH = 420;
    uint256 public constant AMOUNT = 1 ether;

    uint256 constant public PRECISION = 1e18;
    uint256 public constant AUCTION_DURATION = 3600; // 1 hour
    uint256 constant public ABS_MAX_INIT_PRICE = type(uint192).max;
    uint256 constant public PRICE_MULTIPLIER = 2000000000000000000;
    
    string public constant SYMBOL = "PASTA";
    string public constant PROTOCOL = "PastaFactory";

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20Metadata private immutable underlying;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;
    address[] private tokensInUnderlying;
    address[] private bribeTokens;

    address public treasury;

    uint256 public copyPrice = 0.1 ether;
    uint256 public minCreatePrice = 0.1 ether;
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
    error Plugin__InvalidPayment();
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

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying,                    // WBERA
        address _voter, 
        address[] memory _tokensInUnderlying,   // [WBERA]
        address[] memory _bribeTokens,          // [WBERA]
        address _treasury
    ) {
        underlying = IERC20Metadata(_underlying);
        voter = _voter;
        tokensInUnderlying = _tokensInUnderlying;
        bribeTokens = _bribeTokens;
        treasury = _treasury;
        OTOKEN = IVoter(_voter).OTOKEN();

        auctionCreatePrice = minCreatePrice;
        auctionStartTime = block.timestamp;
    }

    function claimAndDistribute() 
        external 
        nonReentrant
    {
        uint256 balance = address(this).balance;
        if (balance > DURATION) {
            address token = getUnderlyingAddress();
            IWBERA(token).deposit{value: balance}();
            uint256 treasuryFee = balance / 5;
            IERC20(token).safeTransfer(treasury, treasuryFee);
            IERC20(token).safeApprove(bribe, 0);
            IERC20(token).safeApprove(bribe, balance - treasuryFee);
            IBribe(bribe).notifyRewardAmount(token, balance - treasuryFee);
        }
    }

    function create(address account, string memory message, uint256 deadline, uint256 maxPayment)         
        external
        payable
        nonReentrant 
        returns (uint256 paymentAmount)
    {
        if (bytes(message).length == 0) revert Plugin__InvalidMessage();
        if (bytes(message).length > MESSAGE_LENGTH) revert Plugin__InvalidMessage();
        if (account == address(0)) revert Plugin__InvalidAccount();
        if (block.timestamp > deadline) revert Plugin__DeadlinePassed();
        
        paymentAmount = getCreatePrice();
        if (paymentAmount > maxPayment) revert Plugin__MaxPaymentExceeded();
        if (msg.value < paymentAmount) revert Plugin__InvalidPayment();

        uint256 newCreatePrice = paymentAmount * PRICE_MULTIPLIER / PRECISION;
        if (newCreatePrice > ABS_MAX_INIT_PRICE) {
            newCreatePrice = ABS_MAX_INIT_PRICE;
        }

        auctionCreatePrice = newCreatePrice;
        auctionStartTime = block.timestamp;

        currentPasta = Pasta(account, message);

        updateQueue(account, message);
    }

    function copy(address account)         
        external
        payable
        nonReentrant 
    {
        if (msg.value < copyPrice) revert Plugin__InvalidPayment();
        if (account == address(0)) revert Plugin__InvalidAccount();
        if (currentPasta.account == address(0)) revert Plugin__InvalidPasta();

        updateCreatorQueue(account);
        updateQueue(account, currentPasta.message);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function updateQueue(address account, string memory message) internal {
        uint256 currentIndex = tail % QUEUE_SIZE;
        if (count == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(queue[head].account, AMOUNT);
            emit Plugin__PastaRemoved(queue[head].account, queue[head].message);
            head = (head + 1) % QUEUE_SIZE;
        }
        queue[currentIndex] = Pasta(account, message);
        tail = (tail + 1) % QUEUE_SIZE;
        count = count < QUEUE_SIZE ? count + 1 : count;
        emit Plugin__PastaAdded(account, message);
        IGauge(gauge)._deposit(account, AMOUNT);
    }

    function updateCreatorQueue(address account) internal {
        uint256 currentIndex = creatorTail % QUEUE_SIZE;
        if (creatorCount == QUEUE_SIZE) {
            IGauge(gauge)._withdraw(creatorQueue[creatorHead], AMOUNT);
            emit Plugin__CreatorRemoved(creatorQueue[creatorHead]);
            creatorHead = (creatorHead + 1) % QUEUE_SIZE;
        }
        creatorQueue[currentIndex] = account;
        creatorTail = (creatorTail + 1) % QUEUE_SIZE;
        creatorCount = creatorCount < QUEUE_SIZE ? creatorCount + 1 : creatorCount;
        emit Plugin__CreatorAdded(account);
        IGauge(gauge)._deposit(account, AMOUNT);
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

    function getUnderlyingName() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingSymbol() public view virtual returns (string memory) {
        return SYMBOL;
    }

    function getUnderlyingAddress() public view virtual returns (address) {
        return address(underlying);
    }

    function getUnderlyingDecimals() public view virtual returns (uint8) {
        return underlying.decimals();
    }

    function getProtocol() public view virtual returns (string memory) {
        return PROTOCOL;
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

    function getTokensInUnderlying() public view virtual returns (address[] memory) {
        return tokensInUnderlying;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
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