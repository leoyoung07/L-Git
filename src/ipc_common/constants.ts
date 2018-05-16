export interface IGitCommand {
  cmd: string;
  args: Array<string>;
  cwd: string;
}

export interface IGitResult {
  cmd: string;
  repository: string;
  result: {
    state: COMMAND_STATE,
    data: Array<string>
  };
}

export interface IGitCommit {
  sha: string;
  msg: string;
  author: string;
  timestamp: number;
}

export interface IGitStatus {
  file: string;
  status: GIT_STATUS;
}

export enum GIT_COMMANDS {
  CHANGES = 'changes',
  COMMIT = 'commit',
  COMPARE = 'compare',
  DIFF = 'diff',
  LOG = 'log',
  OPEN = 'open',
  STAGE = 'stage',
  STATUS = 'status',
  UNSTAGE = 'unstage'
}

export enum GIT_STATUS {
  NEW = 'NEW',
  MODIFIED = 'MODIFIED',
  TYPECHANGE = 'TYPECHANGE',
  RENAMED = 'RENAMED',
  IGNORED = 'IGNORED',
  DELETED = 'DELETED'
}

export enum COMMAND_STATE {
  SUCCESS = 'success',
  FAIL = 'fail'
}

interface IError {
  code: string;
  msg: string;
}
export const ERRORS: {E001: IError} = {
  'E001': {
    code: 'E001',
    msg: 'Please open a git repository first.'
  }
};
