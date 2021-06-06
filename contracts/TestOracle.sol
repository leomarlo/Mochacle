
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract TestOracle is ChainlinkClient {
  // Constants
  address public owner;
  address public ORACLE_ADDRESS = 0xAA1DC356dc4B18f30C347798FD5379F3D77ABC5b; 
  string public JOBID = "b7285d4859da4b289c7861db971baf0a";  // FIXME!!! UPDATE TO GET INT instead of UINT!!
  uint256 private ORACLE_PAYMENT = 10 ** 17;   // actually 10 ** 16, but lets say 17 for good measure.
  int256 public SCORE_FACTOR = 10 ** 3;
  // string public API_IP = "3.122.74.152";
  string public API_URL = "https://testoracle.xyz/submission_ids/";
  address private dead_address;

  // TODO: DELETE THE FOLLOWING
  uint48 public winning_amount;

  // Stages
  enum TestStage {submitted, finished}
  enum SolutionStage {submitted, pass, fail}

  // Test struct
  struct Test {
    address submitter;
    bytes20 testScript;
    uint48 minScore;  // remember the SCORE_FACTOR
    uint256 reward;
    TestStage stage;
  }

  // Solution struct
  struct Solution {
    bytes16 test_id;
    address submitter;
    bytes20 solutionScript;
    uint48 score;  // remember the SCORE_FACTOR
    uint256 blocknumber;
    SolutionStage stage;
  }

  // store Tests
  mapping(bytes16 => Test) public Tests;  // test_id => Test
  mapping(bytes16 => Solution) public Solutions; // solution_id => Solution
  mapping(bytes32 => bytes16) public RequestedSolutionIds;

  // Events
  event submittedTest(bytes16 test_id);
  event submittedSolution(bytes16 solution_id);
  event SolutionPassed(bytes16 solution_id);
  event SolutionDidntPass(bytes16 solution_id);
  event SolutionShouldHavePassed(bytes16 solution_id, byte pass);
  // event TestFinished(bytes16 test_id);
  // event releasedAward(uint256 award);
  // event RequestHasBeenSent(string url, string API_URL, string stringified_hex);
  // event RequestHasBeenSentBareURL(string url);
  // event UintToStringEvent(bytes16 solution_id, string solution_id_string);
  // event fulfilledEvent(bytes32 request_id, bytes16 solution_id, bytes16 test_id);
  // event AtTheEndOfRequest(string _url, string _API_URL, string _solution_id_string, bytes32 _requestId);
  // event RequestHasBeenSentBareURL(string url);
  event Event1(string url, string API, string solution_id_string, bytes32 requestId);

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
      bytes16 _test_id,
      bytes20 testScript,
      uint48 minScore) 
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
      bytes16 _test_id,
      bytes16 _solution_id,
      bytes20 solutionScript)
    external
    // TODO: INCLUDE MODIFIER IN CASE 
  {
    // require that the target test id exists
    require(Tests[_test_id].submitter!=dead_address, 'no such target test_id exists');

    // update the Solution mapping 
    Solutions[_solution_id] = Solution({
      test_id: _test_id,
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
  function requestScore(bytes16 _solution_id) 
    public
    onlyOwnerOrTestSubmitter(Solutions[_solution_id].test_id)
    returns (bytes32) 
  {
    // newRequest takes a JobID, a callback address, and callback function as input
    Chainlink.Request memory req = buildChainlinkRequest(
        stringToBytes32(JOBID),
        address(this),
        this.fulfill.selector);
    
    // give the submitter the gas-burden of calculating the url. maybe it can be 
    // deducted from the reward?
    string memory solution_id_string = bytes16ToHexString(_solution_id);
    string memory url = string(abi.encodePacked(API_URL, solution_id_string));

    // Adds a URL with the key "get" to the request parameters
    req.add("get", url);
    // Uses input param (dot-delimited string) as the "path" in the request parameters
    req.add("path", "return_data_16bytes");
    // // Adds an integer with the key "times" to the request parameters
    // req.addInt("times", SCORE_FACTOR);
    // Sends the request with the amount of payment specified to the oracle

    // emit RequestHasBeenSent(url, API_URL, solution_id_string);
    
    bytes32 requestId = sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
    RequestedSolutionIds[requestId] = _solution_id; 

    emit Event1(url, API_URL, solution_id_string, requestId);

    return requestId;
  }


  // fulfill receives a uint256 data type
  function fulfill(bytes32 _requestId, bytes32 _score_data)
    public
    // Use recordChainlinkFulfillment to ensure only the requesting oracle can fulfill
    recordChainlinkFulfillment(_requestId)
  {
    
    bytes16 _solution_id = RequestedSolutionIds[_requestId];
    bytes16 _test_id = Solutions[_solution_id].test_id;

    // emit fulfillment event
    // emit fulfilledEvent(_requestId, _solution_id, _test_id);
    // get 
    (byte _valid, 
     byte _pass, 
     bytes6 _score,
     bytes24 _script) = getValidationAndScoreFromBytes32(_score_data);

    // check whether submission script hashes agree
    // TODO!! Change the check_submissionResult function
    // require(checkSubmissionResult(_solution_id, _script, _valid), "Invalid request data. Either the solution script has not yet been checked against the test script or the submitted score_data might have been tampered with!");


    uint48 _score48 = get_uint48_score_from_bytes6(_score);
    // require(not_been_tempered_with, 'The submitted score_data has probably been tampered with')
    if (Tests[_test_id].minScore <= _score48){

      // update the Solution struct
      Solutions[_solution_id].stage = SolutionStage.pass;
      emit SolutionPassed(_solution_id);
      // check whether solution exists already
      if (Tests[_test_id].stage != TestStage.finished){
        // transfer the reward
        address payable recipient = payable(Solutions[_solution_id].submitter);
        recipient.transfer(Tests[_test_id].reward);
        // update the Test struct
        Tests[_test_id].stage = TestStage.finished;
      }
      
    } else {
      Solutions[_solution_id].stage = SolutionStage.fail;
      if (_pass==0x00){
        emit SolutionDidntPass(_solution_id);
      } else {
        emit SolutionShouldHavePassed(_solution_id, _pass);
      }
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
  
  modifier onlyOwnerOrTestSubmitter(bytes16 _test_id) {
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

  function checkSubmissionResult(bytes16 _solution_id, bytes24 _script, byte _valid) view private returns(bool) {
    // check whether the last 12 characters of the _script agree with the solutionScript.
    // TODO!!!!
    return Solutions[_solution_id].solutionScript == _script  && _valid!=0x00;
  }

  /*
  *****************************************
  ** Bytes Juggling (Auxiliary) ***********
  *****************************************
  */

  function getValidationAndScoreFromBytes32(bytes32 _data) pure private returns (byte _valid, byte _pass, bytes6 _score, bytes24 _script) {
    assembly {
        let freemem_pointer := mload(0x40)
        mstore(add(freemem_pointer,0x00), _data)
        _valid := mload(add(freemem_pointer,0x00))
        _pass := mload(add(freemem_pointer,0x01))
        _score := mload(add(freemem_pointer,0x02))
        _script := mload(add(freemem_pointer,0x08))
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


  function bytes16ToHexString(bytes16 x) public pure returns (string memory _answer) {
    bytes memory bytesString = new bytes(x.length * 2);
    uint128 number = uint128(x);
    uint8 remainder;
    uint8 current_byte_number = x.length * 2;
    while (number > 0){
        current_byte_number--;
        remainder = uint8(number % 16);
        if (remainder<10){
            bytesString[current_byte_number] = byte(uint8(48 + remainder));
        } else {
            bytesString[current_byte_number] = byte(uint8(87 + remainder));
        }
        number = number / 16;
    }
    for (uint8 i=0; i<current_byte_number; i++){
            bytesString[i] = 0x30;  // 0x30 = '0' in ascii
    }
    return string(bytesString);
  }


  function get_uint48_score_from_bytes6(bytes6 _score) public pure returns (uint48){
    uint8 j = _score.length;
    uint8 n;
    uint48 _result;
    for (uint8 i=0; i<_score.length; i++){
      j--;
      n = uint8(_score[j]);
      if (n>=48 && n<58){
        _result += uint48((n - 48) * (uint48(16) ** i));
      } else if (n>=97 && n<103){
        _result += uint48((n - 87) * (uint48(16) ** i));
      } 
    }
    return _result;
  }

}