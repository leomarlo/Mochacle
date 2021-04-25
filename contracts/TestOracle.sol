
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract TestOracle is ChainlinkClient {
  // Constants
  address public owner;
  address public ORACLE_ADDRESS = 0x3A56aE4a2831C3d3514b5D7Af5578E45eBDb7a40; 
  string public JOBID = "187bb80e5ee74a139734cac7475f3c6e";  // FIXME!!! UPDATE TO GET INT instead of UINT!!
  uint256 private ORACLE_PAYMENT = 10 ** 17;   // actually 10 ** 16, but lets say 17 for good measure.
  int256 public SCORE_FACTOR = 10 ** 3;
  string public API_URL = "http://3.122.74.152:8011/submission_ids/";
  address private dead_address;
  // Stages
  enum TestStage {submitted, finished}
  enum SolutionStage {submitted, pass, fail}

  // Test struct
  struct Test {
    address submitter;
    bytes20 testScript;
    uint64 minScore;  // remember the SCORE_FACTOR
    uint256 reward;
    TestStage stage;
  }

  // Solution struct
  struct Solution {
    bytes20 test_id;
    string url;
    address submitter;
    bytes20 solutionScript;
    uint64 score;  // remember the SCORE_FACTOR
    uint256 blocknumber;
    SolutionStage stage;
  }

  // store Tests
  mapping(bytes20 => Test) public Tests;  // test_id => Test
  mapping(bytes20 => Solution) public Solutions; // solution_id => Solution
  mapping(bytes32 => bytes20) public RequestedSolutionIds;

  // Events
  event submittedTest(bytes20 test_id);
  event submittedSolution(bytes20 solution_id);
  event SolutionPassed(bytes20 solution_id);
  event SolutionDidntPass(bytes20 solution_id);
  event SolutionShouldHavePassed(bytes20 solution_id, byte pass);
  event TestFinished(bytes20 test_id);
  event releasedAward(uint256 award);
  event RequestHasBeenSent(string url);
  event RequestHasBeenSentBareURL(string url);
  event UintToStringEvent(bytes20 solution_id, string solution_id_string);
  // event RequestHasBeenSentBareURL(string url);

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
    onlyOwner
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
      bytes20 _test_id,
      bytes20 testScript,
      uint64 minScore) 
    external 
    payable 
    returns (bool)
  {
    // update the Tests mapping 
    Tests[_test_id] = Test({
      submitter: msg.sender,
      testScript: testScript,
      minScore: minScore,
      reward: msg.value,
      stage: TestStage.submitted});
    // emit submit test event
    emit submittedTest(_test_id);
  }

  // submit Solution
  function submitSolution(
      bytes20 _test_id,
      bytes20 _solution_id,
      bytes20 solutionScript)
    external
    // TODO: INCLUDE MODIFIER IN CASE 
  {
    // require that the target test id exists
    require(Tests[_test_id].submitter!=dead_address, 'no such target test_id exists');

    // give the submitter the gas-burden of creating and storing the api url.
    string memory solution_id_string = bytes20ToString(_solution_id);
    string memory url = string(abi.encodePacked(API_URL, solution_id_string));

    // update the Solution mapping 
    Solutions[_solution_id] = Solution({
      test_id: _test_id,
      url: url,
      submitter: msg.sender,
      solutionScript: solutionScript,
      score: 0,  // could make that signed integer at some point
      blocknumber: block.number,
      stage: SolutionStage.submitted});
    // emit solution event
    emit submittedSolution(_solution_id);
  }


  /*
  *****************************************
  ** API Request and Fulfill Method *******
  *****************************************
  */

  // Creates a Chainlink request with the uint256 multiplier job
  // Ideally, you'd want to pass the oracle payment, address, and jobID as 
  function requestScore(bytes20 _solution_id) 
    public
    onlyOwnerOrTestSubmitter(Solutions[_solution_id].test_id)
  {
    // newRequest takes a JobID, a callback address, and callback function as input
    Chainlink.Request memory req = buildChainlinkRequest(
        stringToBytes32(JOBID),
        address(this),
        this.fulfill.selector);
    // Adds a URL with the key "get" to the request parameters
    req.add("get", Solutions[_solution_id].url);
    // Uses input param (dot-delimited string) as the "path" in the request parameters
    req.add("path", "return_data");
    // // Adds an integer with the key "times" to the request parameters
    // req.addInt("times", SCORE_FACTOR);
    // Sends the request with the amount of payment specified to the oracle
    bytes32 requestId = sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
    RequestedSolutionIds[requestId] = _solution_id; 

    emit RequestHasBeenSent(Solutions[_solution_id].url);
  }


  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, bytes32 _score_data)
    public
    // Use recordChainlinkFulfillment to ensure only the requesting oracle can fulfill
    recordChainlinkFulfillment(_requestId)
    returns(bool)
  {
    bytes20 _solution_id = RequestedSolutionIds[_requestId];
    bytes20 _test_id = Solutions[_solution_id].test_id;

    // get 
    (byte _valid, 
     byte _pass, 
     bytes8 _score,
     bytes20 _script) = getValidationAndScoreFromBytes32(_score_data);

    // check whether submission script hashes agree
    require(checkSubmissionResult(_solution_id, _script, _valid), "Invalid request data. Either the solution script has not yet been checked against the test script or the submitted score_data might have been tampered with!");

    uint64 _score64 = uint64(_score);
    // require(not_been_tempered_with, 'The submitted score_data has probably been tampered with')
    if (Tests[_test_id].minScore <= _score64){
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
      if (_pass==0x00){
        emit SolutionDidntPass(_solution_id);
      } else {
        emit SolutionShouldHavePassed(_solution_id, _pass);
      }
      return false;
    }

  }
  
  // cancelRequest allows the owner or submitter to cancel an unfulfilled request
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

  /*
  *****************************************
  ** Link Token Handling ******************
  *****************************************
  */

  // TODO!! Allow submitters to transfer LINK and withdraw LINK from the contract.

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
  
  modifier onlyOwnerOrTestSubmitter(bytes20 _test_id) {
    require(msg.sender == owner || msg.sender == Tests[_test_id].submitter);
    _;
  }

  /*
  *****************************************
  ** Handle Payments to the Contract ******
  *****************************************
  */
  // receiving funds
  receive() external payable{}  // for good measure


  /*
  *****************************************
  ** Auxilliary functions *****************
  *****************************************
  */

  function checkSubmissionResult(bytes20 _solution_id, bytes20 _script, byte _valid) view private returns(bool) {
    return Solutions[_solution_id].solutionScript == _script  && _valid!=0x00;
  }

  /*
  *****************************************
  ** Bytes Juggling (Auxiliary) ***********
  *****************************************
  */

  function getValidationAndScoreFromBytes32(bytes32 _data) pure private returns (byte _valid, byte _pass, bytes8 _score, bytes20 _script) {
    assembly {
        let freemem_pointer := mload(0x40)
        mstore(add(freemem_pointer,0x00), _data)
        _valid := mload(add(freemem_pointer,0x00))
        _pass := mload(add(freemem_pointer,0x01))
        _score := mload(add(freemem_pointer,0x04))
        _script := mload(add(freemem_pointer,0x0c))
      }

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

  function bytes20ToString(bytes20 x) pure public returns (string memory) {
    bytes memory bytesString = new bytes(20);
    uint charCount = 0;
    uint160 y = uint160(x);
    for (uint8 j = 0; j < 20; j++) {
        byte char = byte(bytes20(uint160(y * uint160((2 ** uint8(8 * j))))));
        if (char != 0) {
            bytesString[charCount] = char;
            charCount++;
        }
    }
    bytes memory bytesStringTrimmed = new bytes(charCount);
    for (uint j = 0; j < charCount; j++) {
        bytesStringTrimmed[j] = bytesString[j];
    }
    return string(bytesStringTrimmed);
  }


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
    
}