// simple mocha testing app, needs to import the testing functions

const { pow, helloworld } = require("./target_243_id_11215_submission.js")
const {assert, expect} = require("chai")

describe("pow", function() {

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