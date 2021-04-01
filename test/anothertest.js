// Node.js' built-in assertion library
const assert = require('assert');

const sum = require('./sum');

describe('sum()', function() {
  it('adds two numbers', function() {
    assert.strictEqual(sum(2, 4), 6);
  });

  it('ignores additional arguments', function() {
    assert.strictEqual(sum(2, 4, 6), 6);
  });
});