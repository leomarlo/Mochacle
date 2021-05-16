const { pow, helloworld } = require("<<<submission>>>")
const {assert, expect} = require("chai")

// same script, but different pass_fraction
describe("power_and_hello_world", function() { 
    // First test function.!     
    it("raises to n-th power", function() {   
      assert.equal(pow(2, 3), 8);   
    });       
    // Second test function.!     
    it("should return hello world in different langauges", function() {
      assert.equal(helloworld("spanish"), "Hola Mundo");  
    });       
  });   