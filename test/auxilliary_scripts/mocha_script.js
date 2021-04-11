const { pow, helloworld } = require("<<<submission>>>")
const {assert, expect} = require("chai")

describe("power_and_hello_world", function() {

    it("raises to n-th power", function() {
      assert.equal(pow(2, 3), 8);
      // assert.equal(pow(3, 5), 243);
    });
    it("should return hello world in different langauges", function() {
      assert.equal(helloworld("spanish"), "Hola Mundo");
      // assert.equal(helloworld("deutsch"), "Hallo Welt");
    });
  
  });
// console.log(pow(4,2))
// console.log(helloworld("spanish"))