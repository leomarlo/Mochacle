const { assert, expect } = require("chai");

describe("Bla", function() {
  let a = 100;
  beforeEach(function() {
      a = 20
      });
  it("Should return the new greeting once it's changed", function() {
    const b = a + 1;
    a = a + 1
    console.log(b)
  });
  it("should do something else", () => {
    const b = a + 1;
    console.log(b)
  });
})