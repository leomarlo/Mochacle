
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract TestOracle is ChainlinkClient {
  // Constants
  address public owner;
  address public ORACLE_ADDRESS = 0x3A56aE4a2831C3d3514b5D7Af5578E45eBDb7a40; 
  string public JOBID = "e5b0e6aeab36405ba33aea12c6988ed6";  // FIXME!!! UPDATE TO GET INT instead of UINT!!
  uint256 private ORACLE_PAYMENT = 10 ** 18;
  int256 public SCORE_FACTOR = 10 ** 3;
  string public API_URL = "http://3.122.74.152:8011/submission_ids/";
  
  // Stages
  enum TestStage {submitted, finished}
  enum SolutionStage {submitted, pass, fail}

  // Test struct
  struct Test {
    address submitter;
    bytes32 testScript;
    uint256 minScore;  // remember the SCORE_FACTOR
    uint256 reward;
    TestStage stage;
  }

  // Solution struct
  struct Solution {
    uint test_id;
    address submitter;
    bytes32 solutionScript;
    int score;  // remember the SCORE_FACTOR
    uint blocknumber;
    SolutionStage stage;
  }

  // store Tests
  mapping(uint256 => Test) public Tests;  // test_id => Test
  mapping(uint256 => Solution) public Solutions; // solution_id => Solution
  uint256 public test_id = 1000;
  uint256 public solution_id = 1000;
  mapping (bytes32 => uint256) public RequestedSolutionIds;

  // Events
  event submittedTest(uint256 test_id);
  event submittedSolution(uint256 solution_id);
  event SolutionPassed(uint256 solution_id);
  event SolutionDidntPass(uint256 solution_id);
  event TestFinished(uint256 test_id);
  event releasedAward(uint256 award);

  constructor() public {
    // Set the address for the LINK token for the network
    setPublicChainlinkToken();
    owner = msg.sender;
  }


  /*
  *****************************************
  ** Modify Methods ***********************
  *****************************************
  */

  function changeApiUrl(
      string calldata new_url) 
    external 
    onlyOwner
  {
    API_URL = new_url;
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


  /*
  *****************************************
  ** Submit Methods ***********************
  *****************************************
  */

  // submit Test
  function submitTest(
      bytes32 testScript,
      uint256 minScore) 
    external 
    payable 
    returns (bool)
  {
    // update the Tests mapping 
    Tests[test_id] = Test({
      submitter: msg.sender,
      testScript: testScript,
      minScore: minScore,
      reward: msg.value,
      stage: TestStage.submitted});
    // emit submit test event
    emit submittedTest(test_id);

    // update the test_id
    test_id += 1;
  }

  // submit Solution
  function submitSolution(
      uint testId,
      bytes32 solutionScript)
    external
    // TODO: INCLUDE MODIFIER IN CASE 
  {
    // update the Solution mapping 
    Solutions[test_id] = Solution({
      test_id: testId,
      submitter: msg.sender,
      solutionScript: solutionScript,
      score: -1,  // could make that signed integer at some point
      blocknumber: block.number,
      stage: SolutionStage.submitted});
    // emit solution event
    emit submittedSolution(solution_id);
    // update the test_id
    solution_id += 1;
  }


  /*
  *****************************************
  ** API Request and Fulfill Method *******
  *****************************************
  */

  // Creates a Chainlink request with the uint256 multiplier job
  // Ideally, you'd want to pass the oracle payment, address, and jobID as 
  function requestScore(uint256 _solution_id) 
    public
    onlyOwnerOrTestSubmitter(Solutions[_solution_id].test_id)
  {
    // newRequest takes a JobID, a callback address, and callback function as input
    Chainlink.Request memory req = buildChainlinkRequest(
        stringToBytes32(JOBID),
        address(this),
        this.fulfill.selector);

    // Adds a URL with the key "get" to the request parameters
    req.add("get", string(abi.encodePacked(API_URL, uintToString(_solution_id))));
    // Uses input param (dot-delimited string) as the "path" in the request parameters
    req.add("path", "score");
    // Adds an integer with the key "times" to the request parameters
    req.addInt("times", SCORE_FACTOR);
    // Sends the request with the amount of payment specified to the oracle
    bytes32 requestId = sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
    RequestedSolutionIds[requestId] = _solution_id; 
  }


  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, uint256 _score)
    public
    // Use recordChainlinkFulfillment to ensure only the requesting oracle can fulfill
    recordChainlinkFulfillment(_requestId)
    returns(bool)
  {
    uint256 _solution_id = RequestedSolutionIds[_requestId];
    uint256 _test_id = Solutions[_solution_id].test_id;

    if (Tests[_test_id].minScore <= _score){
      // transfer the reward
      address payable recipient = payable(Solutions[_solution_id].submitter);
      recipient.transfer(Tests[_test_id].reward);
      emit releasedAward(Tests[_test_id].reward);
      // update the Test struct
      Tests[_test_id].stage = TestStage.finished;
      emit TestFinished(_test_id);
      // update the Solution struct
      Solutions[_solution_id].stage = SolutionStage.pass;
      emit SolutionPassed(_solution_id);
      return true;
    } else {
      Solutions[_solution_id].stage = SolutionStage.fail;
      emit SolutionDidntPass(_solution_id);
      return false;
    }

  }
  
  // cancelRequest allows the owner to cancel an unfulfilled request
  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
    onlyOwnerOrTestSubmitter(Solutions[RequestedSolutionIds[_requestId]].test_id)
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
  
  /*
  *****************************************
  ** Modifiers ****************************
  *****************************************
  */

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }
  
  modifier onlyOwnerOrTestSubmitter(uint256 _test_id) {
    require(msg.sender == owner || msg.sender == Tests[_test_id].submitter);
    _;
  }

  /*
  *****************************************
  ** Auxilliary functions *****************
  *****************************************
  */

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

  // function append(string a, string b, string c, string d, string e) internal pure returns (string) {

  //   return string(abi.encodePacked(a, b, c, d, e));

  // }

  // function uintToString(uint v) returns (string memory str) {
  //       uint maxlength = 100;
  //       bytes memory reversed = new bytes(maxlength);
  //       uint i = 0;
  //       while (v != 0) {
  //           uint8 remainder = v % 10;
  //           v = v / 10;
  //           reversed[i++] = byte(48 + remainder);
  //       }
  //       bytes memory s = new bytes(i + 1);
  //       for (uint j = 0; j <= i; j++) {
  //           s[j] = reversed[i - j];
  //       }
  //       str = string(s);
  //   }

  function uintToString(uint _i) internal pure returns (string memory _uintAsString) {
    if (_i == 0) {
        return "0";
    }
    uint j = _i;
    uint len;
    while (j != 0) {
        len++;
        j /= 10;
    }
    bytes memory bstr = new bytes(len);
    uint k = len - 1;
    while (_i != 0) {
        bstr[k--] = byte(uint8(48 + _i % 10));
        _i /= 10;
    }
    return string(bstr);
  }
    
  // receiving funds
  receive() external payable{}  // for good measure

}