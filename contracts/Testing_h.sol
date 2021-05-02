
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract Testing_h is ChainlinkClient {

  bytes32 public data_answer;
  bytes32 public data_baseline = 0x0101000000000000000003e85c14e3ef90b60dbe7b3537b670cb6eb12b329180;

  // address public ORACLE_ADDRESS = 0x3A56aE4a2831C3d3514b5D7Af5578E45eBDb7a40; 
  // string public JOBID = "187bb80e5ee74a139734cac7475f3c6e";  
  // uint256 private ORACLE_PAYMENT = 10 ** 17;   
  address public ORACLE_ADDRESS = 0x56dd6586DB0D08c6Ce7B2f2805af28616E082455; 
  string public JOBID = "c128fbb0175442c8ba828040fdd1a25e";  
  uint256 private ORACLE_PAYMENT = 10 ** 17;   

  event RequestSent(bytes32 _requestId);

  constructor() public {
    setPublicChainlinkToken();
  }

  function changeOracle(
      address _ORACLE_ADDRESS,
      string memory _JOBID,
      uint256 _ORACLE_PAYMENT)
    public 
  {
    // Set the address for the LINK token for the network
    JOBID = _JOBID;
    ORACLE_ADDRESS = _ORACLE_ADDRESS;
    ORACLE_PAYMENT = _ORACLE_PAYMENT;
  }



  function requestScore() 
    public
    returns (bytes32)  
  {
    // newRequest takes a JobID, a callback address, and callback function as input
    Chainlink.Request memory req = buildChainlinkRequest(
        stringToBytes32(JOBID),
        address(this),
        this.fulfill.selector);

    req.add("get", "http://3.122.74.152:8011/submission_ids/9618eee4fa50aa1dcdf3c4d4390bf5d3");
    req.add("path", "return_data_no_0x");
    
    bytes32 requestId = sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
    
    emit RequestSent(requestId);

    return requestId;
  }



  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, bytes32 _score_data)
    public
    recordChainlinkFulfillment(_requestId)
  {
    data_answer = _score_data;
  }


  function stringToBytes32(string memory source) private pure returns (bytes32 result) {
    bytes memory tempEmptyStringTest = bytes(source);
    if (tempEmptyStringTest.length == 0) {
      return 0x0;
    }
    assembly { // solhint-disable-line no-inline-assembly
      result := mload(add(source, 32))
    }
  }

}