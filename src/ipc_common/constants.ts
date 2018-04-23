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

export enum GIT_COMMANDS {
  DIFF = 'diff',
  LOG = 'log',
  OPEN = 'open',
  STATUS = 'status'
}

export enum GIT_STATUS {
  NEW = 'NEW',
  MODIFIED = 'MODIFIED',
  TYPECHANGE = 'TYPECHANGE',
  RENAMED = 'RENAMED',
  IGNORED = 'IGNORED'
}

export enum COMMAND_STATE {
  SUCCESS = 'success',
  FAIL = 'fail'
}
