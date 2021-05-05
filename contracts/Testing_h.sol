
pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

// MyContract inherits the ChainlinkClient contract to gain the
// functionality of creating Chainlink requests
contract Testing_h is ChainlinkClient {

  bytes32 public data_answer;
  uint48 public score;
  bytes6 public score_bytes;
  bytes24 public script24;
  // address public ORACLE_ADDRESS = 0x3A56aE4a2831C3d3514b5D7Af5578E45eBDb7a40; 
  // string public JOBID = "187bb80e5ee74a139734cac7475f3c6e";  
  // uint256 private ORACLE_PAYMENT = 10 ** 17;   
  address public ORACLE_ADDRESS = 0xAA1DC356dc4B18f30C347798FD5379F3D77ABC5b; 
  string public JOBID = "b7285d4859da4b289c7861db971baf0a";  
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
    req.add("path", "return_data_16bytes");
    
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
      // get 
    (byte _valid, 
     byte _pass, 
     bytes6 _score,
     bytes24 _script) = getValidationAndScoreFromBytes32(_score_data);
    score = get_uint48_score_from_bytes6(_score);
    script24 = _script;
    score_bytes = _score;
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

  // function bytes24ToString(bytes24 x) public returns (string memory) {
  //   bytes memory bytesString = new bytes(x.length);
  //   uint charCount = 0;
  //   for (uint j = 0; j < x.length; j++) {
  //       byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
  //       if (char != 0) {
  //           bytesString[charCount] = char;
  //           charCount++;
  //       }
  //   }
  //   bytes memory bytesStringTrimmed = new bytes(charCount);
  //   for (j = 0; j < charCount; j++) {
  //       bytesStringTrimmed[j] = bytesString[j];
  //   }
  //   return string(bytesStringTrimmed);
  // }


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