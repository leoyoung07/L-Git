export interface IGitCommand {
  cmd: string;
  args: Array<string>;
  cwd: string;
}

export interface IGitResult {
  cmd: string;
  result: Array<string>;
}

export enum GIT_COMMANDS {
  STATUS = 'status'
}

export enum GIT_STATUS {
  NEW = 'NEW',
  MODIFIED = 'MODIFIED',
  TYPECHANGE = 'TYPECHANGE',
  RENAMED = 'RENAMED',
  IGNORED = 'IGNORED'
}
