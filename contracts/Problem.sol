// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

contract Problem is ChainlinkClient {
  address public owner;
  address public ORACLE_ADDRESS = 0x56dd6586DB0D08c6Ce7B2f2805af28616E082455;
  string public JOBID = "c128fbb0175442c8ba828040fdd1a25e"; 
  uint256 public ORACLE_PAYMENT = 10 ** 17;
  string public API_URL = "https://testoracle.xyz/submission_ids/3cbbca3cf40db491530b29f24ba5abed";


  bool public fulfilled;
  bytes32 public requestAnswer;


  constructor() public {
    setPublicChainlinkToken();
    owner = msg.sender;
  }

   /*
  *****************************************
  ** API Request and Fulfill Method *******
  *****************************************
  */


  function requestScore() public returns (bytes32) {
      Chainlink.Request memory req = buildChainlinkRequest(
          stringToBytes32(JOBID),
          address(this),
          this.fulfill.selector);
      req.add("get", API_URL);
      req.add("path", "return_data_16bytes");
      return sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
  }


  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, bytes32 _score_data)
    public
    recordChainlinkFulfillment(_requestId)
  {
    fulfilled = true;
    requestAnswer = _score_data;

  }
  
  // cancelRequest allows the owner or submitter to cancel an unfulfilled request
  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
  {
    cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
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