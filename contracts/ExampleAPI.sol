
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract ExampleAPI is ChainlinkClient {
  // Stores the answer from the Chainlink oracle
  uint256 public currentPrice;
  address public owner;
  
    // The address of an oracle - you can find node addresses on https://market.link/search/nodes
  address ORACLE_ADDRESS; //0xB36d3709e22F7c708348E225b20b13eA546E6D9c;
  
  // The address of the http get job - you can find job IDs on https://market.link/search/jobs
  string public JOBID; 
  
  string public deployer_name;
  // 17 0s = 0.1 LINK 
  // 18 0s = 1 LINK 
  uint256 private ORACLE_PAYMENT = 10 ** 18;

  event CurrentPrice(uint256 currentPrice);

  constructor(address _ORACLE_ADDRESS, string memory _JOBID, uint256 _ORACLE_PAYMENT) public {
    // Set the address for the LINK token for the network
    setPublicChainlinkToken();
    owner = msg.sender;
    deployer_name = "guess who";

    JOBID = _JOBID;
    ORACLE_ADDRESS = _ORACLE_ADDRESS;
    ORACLE_PAYMENT = _ORACLE_PAYMENT;
  }

  function change_oracle(address _ORACLE_ADDRESS, string memory _JOBID, uint256 _ORACLE_PAYMENT) public {
    // Set the address for the LINK token for the network
    JOBID = _JOBID;
    ORACLE_ADDRESS = _ORACLE_ADDRESS;
    ORACLE_PAYMENT = _ORACLE_PAYMENT;
  }

  // Creates a Chainlink request with the uint256 multiplier job
  // Ideally, you'd want to pass the oracle payment, address, and jobID as 
  function requestEthereumPrice() 
    public
    onlyOwner
  {
    // newRequest takes a JobID, a callback address, and callback function as input
    Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32(JOBID), address(this), this.fulfill.selector);
    // Adds a URL with the key "get" to the request parameters
    req.add("get", "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD");
    // Uses input param (dot-delimited string) as the "path" in the request parameters
    req.add("path", "USD");
    // Adds an integer with the key "times" to the request parameters
    req.addInt("times", 100);
    // Sends the request with the amount of payment specified to the oracle
    sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
  }

  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, uint256 _price)
    public
    // Use recordChainlinkFulfillment to ensure only the requesting oracle can fulfill
    recordChainlinkFulfillment(_requestId)
  {
    currentPrice = _price;
    emit CurrentPrice(currentPrice);
  }
  
  // cancelRequest allows the owner to cancel an unfulfilled request
  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
    onlyOwner
  {
    cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
  }

  
  // withdrawLink allows the owner to withdraw any extra LINK on the contract
  function withdrawLink()
    public
    onlyOwner
  {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
  }
  
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }
  
   // A helper funciton to make the string a bytes32
  function stringToBytes32(string memory source) private pure returns (bytes32 result) {
    bytes memory tempEmptyStringTest = bytes(source);
    if (tempEmptyStringTest.length == 0) {
      return 0x0;
    }
    assembly { // solhint-disable-line no-inline-assembly
      result := mload(add(source, 32))
    }
  }

  // checking whats inside the contract //TODO! REMOVE
//   function getJOBID
}