// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

/// @title An on-chain code-testing and code-rewardng suite.
/// @author Leonhard M. Horstmeyer
/// @notice This is the alpha version. Expect upgrades!
/// @dev This code calls a single chainlink oracle to request a bytes32 entry from an api that holds information about the status of the code against a mocha test script.
contract Mochacle is ChainlinkClient {
  // Owner information
  address public owner;
  // Oracle information
  address public ORACLE_ADDRESS;
  string public JOBID; 
  uint256 private ORACLE_PAYMENT;
  // decimals to represent the score in percent (e.g 854 = 85.4%)
  int256 public SCORE_FACTOR = 10 ** 3;
  // API information
  string public API_URL;
  address private dead_address;


  // Stages for test and solution
  enum TestStage {submitted, finished}
  enum SolutionStage {submitted, pass, fail}

  // Test structure
  struct Test {
    address submitter;
    bytes20 testScript;
    uint48 minScore;  // remember the SCORE_FACTOR
    uint256 reward;
    TestStage stage;
  }

  // Solution structure
  struct Solution {
    bytes16 test_id;
    address submitter;
    bytes20 solutionScript;
    uint48 score;  // note the SCORE_FACTOR
    uint256 blocknumber;
    bytes32 requestId;
    SolutionStage stage;
  }

  // All Tests and Solutions
  mapping(bytes16 => Test) public Tests;  // test_id => Test
  mapping(bytes16 => Solution) public Solutions; // solution_id => Solution
  mapping(bytes32 => bytes16) public RequestedSolutionIds;

  // Events
  event submittedTest(bytes16 test_id);
  event submittedSolution(bytes16 solution_id);
  event SolutionPassed(bytes16 solution_id);
  event SolutionDidntPass(bytes16 solution_id);
  event SolutionShouldHavePassed(bytes16 solution_id, byte pass);

  /// @notice Initialize the Chainlink Token and set the API url and the owner
  /// @dev Could become Ownable at some point
  /// @param _API_URL The initial API_URL (For testing this should be set to a testing URL)
  constructor(string memory _API_URL) public {
    // Set the address for the LINK token for the network
    setPublicChainlinkToken();
    owner = msg.sender;
    API_URL = _API_URL;
  }

  /*
  *****************************************
  ** Setter Methods ***********************
  *****************************************
  */

  /// @notice Sets the new API url, in case it changes.
  /// @dev The API should end with a slash (e.g. "https://testoracle.xyz/submission_ids/ is the current one).
  /// @param new_url the new URL for the API
  function changeApiUrl(
      string calldata new_url) 
    external 
    onlyOwner
  {
    API_URL = new_url;
  }

  /// @notice Sets the new owner of the contract
  /// @dev can only be changed by the current owner
  /// @param new_owner the new owner address
  function changeOwner(
      address new_owner) 
    external 
    onlyOwner
  {
    owner = new_owner;
  }

  /// @notice Sets the chainlink oracle
  /// @dev In the next upgrade there should be multiple oracles. Only the owner can change it.
  /// @param _ORACLE_ADDRESS the oracle address
  /// @param _JOBID the oracle job id
  /// @param _ORACLE_PAYMENT the payment in LINK-smalled denomination.
  function setOracle(
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

  /// @notice Submit a new test (is a payable function)
  /// @dev test_id is a SHA1 encoding and unique, given the address, the script and the chainId. testScript is the bytes20-encoded CID of the script
  /// @param _test_id test_id is the first 16 bytes of the SHA1-encoding of (script CID + address + chainId) 
  /// @param testScript bytes20-encoded CID of the script
  /// @param minScore uint48 value of the minimim score (max would be 1000)
  /// @return success_flag (boolean)
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

  /// @notice Submit a new solution for a given test
  /// @dev solutionScript is the bytes20-encoded CID of the script
  /// @param _test_id test_id, encoded as above
  /// @param _solution_id _solution_id, encoded as _test_id
  /// @param solutionScript bytes20-encoded CID of the script
  function submitSolution(
      bytes16 _test_id,
      bytes16 _solution_id,
      bytes20 solutionScript)
    external
  {
    // require that the target test id exists
    require(Tests[_test_id].submitter!=dead_address, 'no such target test_id exists');

    // update the Solution mapping 
    Solutions[_solution_id] = Solution({
      test_id: _test_id,
      submitter: msg.sender,
      solutionScript: solutionScript,
      score: 0,  /* could make that signed integer at some point */
      blocknumber: block.number,
      requestId: 0x0,
      stage: SolutionStage.submitted});
    // emit solution event
    emit submittedSolution(_solution_id);
  }


  /*
  *****************************************
  ** API Request and Fulfill Method *******
  *****************************************
  */



  /// @notice calls the API to request the score of the solution script
  /// @dev At this point everyone can call this method.
  /// @param _solution_id _solution_id, encoded as above
  /// @return requestId a bytes32 unique identifier for this request.
  function requestScore(bytes16 _solution_id) public returns (bytes32) {
    Chainlink.Request memory req = buildChainlinkRequest(
        stringToBytes32(JOBID),
        address(this),
        this.fulfill.selector);
    string memory url = string(abi.encodePacked(API_URL, bytes16ToHexString(_solution_id)));
    req.add("get", url);
    req.add("path", "return_data_16bytes");
    bytes32 requestId = sendChainlinkRequestTo(ORACLE_ADDRESS, req, ORACLE_PAYMENT);
    RequestedSolutionIds[requestId] = _solution_id; 
    Solutions[_solution_id].requestId = requestId;
    return requestId;
  }

  /// @notice receives a bytes32-encoded string of the api call
  /// @param _requestId _requestId to match request with fulfillment uniquely.
  function fulfill(bytes32 _requestId, bytes32 _score_data)
    public
    recordChainlinkFulfillment(_requestId)
  {
    
    bytes16 _solution_id = RequestedSolutionIds[_requestId];
    bytes16 _test_id = Solutions[_solution_id].test_id;

    // decode the bytes32 received API-data into score and pass data.
    (byte _valid, 
     byte _pass, 
     bytes6 _score,
     bytes24 _script) = getValidationAndScoreFromBytes32(_score_data);

    // further convert the score bytes into a uint48 value
    uint48 _score48 = getUint48ScoreFromBytes6(_score);
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
  /// @notice calls the API to request the score of the solution script
  /// @dev At this point everyone can call this method.
  /// @param _requestId uniquely identify the request to be cancelled
  /// @param _payment payment for the cancellation in LINKs smallest denomination
  /// @param _callbackFunctionId unique identifier of the callback function
  /// @param _expiration expiry time in seconds after 1970
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
  
  /// @notice Allows the owner to withdraw any extra LINK on the contract
  /// @dev uses LinkToken Interface
  function withdrawLink()
    public
    onlyOwner
  {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
  }


  /// @notice Allows anyone to check whether contract needs LINK funding
  /// @dev uses LinkToken Interface
  /// @return returns link balance
  function getLinkBalance()
    public
    returns (uint256)
  {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    return link.balanceOf(address(this));
  }

  /*
  *****************************************
  ** Modifiers ****************************
  *****************************************
  */

  /// @notice only owner modifier
  modifier onlyOwner() {
    require(msg.sender == owner, "Only Owner!");
    _;
  }
  
  /// @notice only owner or submitter of a test
  /// @param _test_id the submitter of this test_id can call the function with this modifier.
  modifier onlyOwnerOrTestSubmitter(bytes16 _test_id) {
    require(msg.sender == owner || msg.sender == Tests[_test_id].submitter, "Owner or Submitter");
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

  /// @notice checks whether the submission is legit
  /// @dev compares script CIDs and validity flags
  /// @param _solution_id _solution_id, encoded as above
  /// @param _script script (should be bytes20)
  /// @param _valid bytes1 validity flag
  /// @return a boolen. True if the submission is valid..
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

  /// @notice decodes bytes32 response from API request
  /// @dev compares script CIDs and validity flags
  /// @param _data to be decoded bytes32 data
  /// @return _valid decoded validity flag
  /// @return _pass decoded pass flag
  /// @return _pass decoded score bytes
  /// @return _script. decoded script bytes
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

  /// @notice convert bytes16 string of hex-literals.
  /// @param x bytes16 value to be converted
  /// @return string of hex-literals
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

  /// @notice convert bytes6 value into unit48 score
  /// @param _score bytes6 score value
  /// @return score value
  function getUint48ScoreFromBytes6(bytes6 _score) public pure returns (uint48){
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