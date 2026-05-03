export const RESET_ALL_USERS_CONFIRMATION_FLAG = '--confirm-delete-all-users';
export const RESET_ALL_USERS_REQUIRED_PHRASE = 'DELETE_ALL_USERS';

export interface ResetUsersScriptOptions {
  hasConfirmationFlag: boolean;
  typedPhrase: string;
  backupDir: string;
  skipBackupExport: boolean;
}

const readArgumentValue = (args: string[], key: string): string => {
  const prefix = `${key}=`;
  const prefixedArg = args.find((arg) => arg.startsWith(prefix));
  if (prefixedArg) {
    return prefixedArg.slice(prefix.length).trim();
  }

  const argIndex = args.indexOf(key);
  if (argIndex >= 0 && args[argIndex + 1]) {
    return String(args[argIndex + 1]).trim();
  }

  return '';
};

export const parseResetUsersScriptOptions = (argv: string[]): ResetUsersScriptOptions => {
  const args = argv.slice(2);

  return {
    hasConfirmationFlag: args.includes(RESET_ALL_USERS_CONFIRMATION_FLAG),
    typedPhrase: readArgumentValue(args, '--type'),
    backupDir: readArgumentValue(args, '--backup-dir'),
    skipBackupExport: args.includes('--skip-backup-export'),
  };
};

export const validateResetUsersScriptOptions = (options: ResetUsersScriptOptions): string | null => {
  if (!options.hasConfirmationFlag) {
    return `Missing required flag: ${RESET_ALL_USERS_CONFIRMATION_FLAG}`;
  }

  if (options.typedPhrase !== RESET_ALL_USERS_REQUIRED_PHRASE) {
    return `Missing required confirmation phrase. Provide --type ${RESET_ALL_USERS_REQUIRED_PHRASE}`;
  }

  return null;
};
