pragma solidity ^0.6.0;

import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

contract APIConsumer is ChainlinkClient {
    

    uint256 public volume;
    uint256 public some_number;
    string public current_status;
    
    address private oracle;
    bytes32 private jobId;
    uint256 private fee;
    
    /**
     * Network: Kovan
     * Oracle: 0x2f90A6D021db21e1B2A077c5a37B3C7E75D15b7e
     * Job ID: 29fa9aa13bf1468788b7cc4a500a45b8
     * Fee: 0.1 LINK
     */
    constructor() public {
        setPublicChainlinkToken();
        oracle = 0xC361e04Aa8637FB12bf1bc6261D8160fb317d751; //0x1006553C2856F55886c787AAC5899D2Bb6e4DcC6; //0x2f90A6D021db21e1B2A077c5a37B3C7E75D15b7e;
        jobId = "f822043129b845f88b7552ae73f65bf6"; //"50517a452bb34385981ba29c9dba5df3"; // "29fa9aa13bf1468788b7cc4a500a45b8";
        fee = 1 * 10 ** 18; // 0.1 LINK
        current_status = "no call yet";
    }
    
    /**
     * Create a Chainlink request to retrieve API response, find the target
     * data, then multiply by 1000000000000000000 (to remove decimal places from data).
     */
    function requestVolumeData() public returns (bytes32 requestId) 
    {
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        
        // Set the URL to perform the GET request on
        request.add("get", "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD");
        
        // Set the path to find the desired data in the API response, where the response format is:
        // {"RAW":
        //   {"ETH":
        //    {"USD":
        //     {
        //      "VOLUME24HOUR": xxx.xxx,
        //     }
        //    }
        //   }
        //  }
        request.add("path", "RAW.ETH.USD.VOLUME24HOUR");
        
        // Multiply the result by 1000000000000000000 to remove decimals
        int timesAmount = 10**18;
        request.addInt("times", timesAmount);
        
        current_status = "somethings on the way. Get request sent.";
        // Sends the request
        return sendChainlinkRequestTo(oracle, request, fee);
    }
    
    function test(uint _hallo) public returns(uint) {
        some_number = _hallo + 5;
        return some_number;
    }
    /**
     * Receive the response in the form of uint256
     */ 
    function fulfill(bytes32 _requestId, uint256 _volume) public recordChainlinkFulfillment(_requestId)
    {
        volume = _volume;

        current_status = "somethings got back. Get request returned.";
    }
}