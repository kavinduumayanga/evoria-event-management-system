import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseResetUsersScriptOptions,
  validateResetUsersScriptOptions,
  RESET_ALL_USERS_CONFIRMATION_FLAG,
  RESET_ALL_USERS_REQUIRED_PHRASE,
} from '../src/utils/resetUsersArgs';

test('reset-users script args parser detects missing confirmation flag', () => {
  const options = parseResetUsersScriptOptions([
    'node',
    'script',
    '--type',
    RESET_ALL_USERS_REQUIRED_PHRASE,
  ]);

  assert.equal(options.hasConfirmationFlag, false);
  assert.match(
    String(validateResetUsersScriptOptions(options)),
    /Missing required flag/,
  );
});

test('reset-users script args parser detects missing typed phrase', () => {
  const options = parseResetUsersScriptOptions([
    'node',
    'script',
    RESET_ALL_USERS_CONFIRMATION_FLAG,
  ]);

  assert.equal(options.hasConfirmationFlag, true);
  assert.match(
    String(validateResetUsersScriptOptions(options)),
    /Missing required confirmation phrase/,
  );
});

test('reset-users script args parser accepts valid destructive confirmation', () => {
  const options = parseResetUsersScriptOptions([
    'node',
    'script',
    RESET_ALL_USERS_CONFIRMATION_FLAG,
    '--type',
    RESET_ALL_USERS_REQUIRED_PHRASE,
    '--backup-dir',
    './backups/pre-reset',
  ]);

  assert.equal(options.hasConfirmationFlag, true);
  assert.equal(options.typedPhrase, RESET_ALL_USERS_REQUIRED_PHRASE);
  assert.equal(options.backupDir, './backups/pre-reset');
  assert.equal(validateResetUsersScriptOptions(options), null);
});
