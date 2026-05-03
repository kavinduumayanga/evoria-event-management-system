import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, validateUserAccountEmail } from '../src/utils/emailValidation';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  John.DOE@Example.COM  '), 'john.doe@example.com');
});

test('rejects invalid format email', () => {
  const result = validateUserAccountEmail('abc');
  assert.equal(result.isValid, false);
  assert.equal(result.reason, 'invalid_format');
});

test('rejects blocked exact fake email', () => {
  const result = validateUserAccountEmail('test@test.com');
  assert.equal(result.isValid, false);
  assert.equal(result.reason, 'blocked_exact_email');
});

test('rejects example domains and disposable domains', () => {
  const exampleResult = validateUserAccountEmail('user@example.org');
  assert.equal(exampleResult.isValid, false);
  assert.equal(exampleResult.reason, 'blocked_example_domain');

  const disposableResult = validateUserAccountEmail('hello@mailinator.com');
  assert.equal(disposableResult.isValid, false);
  assert.equal(disposableResult.reason, 'blocked_domain');
});

test('accepts normal real-looking domains', () => {
  const result = validateUserAccountEmail('alice@company.io');
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedEmail, 'alice@company.io');
});
