// Assert stub for browser environment
// This provides a minimal assert implementation for dependencies that require it

function assert(value: any, message?: string): asserts value {
  if (!value) {
    throw new Error(message || 'Assertion failed');
  }
}

assert.ok = assert;
assert.equal = (actual: any, expected: any, message?: string) => {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
};
assert.notEqual = (actual: any, expected: any, message?: string) => {
  if (actual === expected) {
    throw new Error(message || `Expected not ${expected}, but got ${actual}`);
  }
};
assert.strictEqual = assert.equal;
assert.notStrictEqual = assert.notEqual;
assert.deepEqual = (actual: any, expected: any, message?: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected deep equal, but got different values`);
  }
};
assert.notDeepEqual = (actual: any, expected: any, message?: string) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    throw new Error(message || `Expected not deep equal, but got same values`);
  }
};

export default assert;

