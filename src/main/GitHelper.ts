import { ipcMain } from 'electron';
import { readFileSync } from 'fs';
import Git from 'nodegit';
import path from 'path';
import {
  COMMAND_STATE,
  ERRORS,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitResult
} from '../ipc_common/constants';
export default class GitHelper {
  private static repository: Git.Repository | null = null;
  public static RegisterIpcHandler() {
    ipcMain.on('git-command', async (event: Electron.Event, msg?: string) => {
      if (msg) {
        const command: IGitCommand = JSON.parse(msg);
        let reply: IGitResult;
        if (GitHelper.repository) {
          switch (command.cmd) {
            case GIT_COMMANDS.STATUS:
              reply = await this.statusHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.OPEN:
              reply = await this.openHandler(command);
              break;
            case GIT_COMMANDS.CHANGES:
              reply = await this.changesHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.DIFF:
              reply = await this.diffHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.LOG:
              reply = await this.logHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.STAGE:
              reply = await this.stageHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.COMPARE:
              reply = await this.compareHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.COMMIT:
              reply = await this.commitHandler(command, GitHelper.repository);
              break;
            default:
              reply = {
                cmd: command.cmd,
                repository: GitHelper.repository ? GitHelper.repository.path() : '',
                result: {
                  state: COMMAND_STATE.SUCCESS,
                  data: []
                }
              };
              break;
          }
        } else if (command.cmd === GIT_COMMANDS.OPEN) {
          reply = await this.openHandler(command);
        } else {
          reply = {
            cmd: command.cmd,
            repository: '',
            result: {
              state: COMMAND_STATE.FAIL,
              data: [ERRORS.E001.code, ERRORS.E001.msg]
            }
          };
        }
        event.sender.send('git-result', JSON.stringify(reply));
      }
    });
  }
  private static fileStatusToText(status: Git.StatusFile) {
    const words = [];
    if (status.isNew()) {
      words.push(GIT_STATUS.NEW);
    }
    if (status.isModified()) {
      words.push(GIT_STATUS.MODIFIED);
    }
    if (status.isTypechange()) {
      words.push(GIT_STATUS.TYPECHANGE);
    }
    if (status.isRenamed()) {
      words.push(GIT_STATUS.RENAMED);
    }
    if (status.isIgnored()) {
      words.push(GIT_STATUS.IGNORED);
    }
    if (status.isDeleted()) {
      words.push(GIT_STATUS.IGNORED);
    }
    return words.join(' ');
  }

  private static patchStatusToText(status: Git.ConvenientPatch) {
    const words = [];
    if (status.isAdded()) {
      words.push(GIT_STATUS.NEW);
    }
    if (status.isModified()) {
      words.push(GIT_STATUS.MODIFIED);
    }
    if (status.isTypeChange()) {
      words.push(GIT_STATUS.TYPECHANGE);
    }
    if (status.isRenamed()) {
      words.push(GIT_STATUS.RENAMED);
    }
    if (status.isIgnored()) {
      words.push(GIT_STATUS.IGNORED);
    }
    if (status.isDeleted()) {
      words.push(GIT_STATUS.IGNORED);
    }
    return words.join(' ');
  }

  private static async openHandler(command: IGitCommand): Promise<IGitResult> {
    let repositoryPath: string;
    if (command.args.length > 0) {
      repositoryPath = command.args[0];
    } else {
      repositoryPath = command.cwd;
    }
    GitHelper.repository = await Git.Repository.open(repositoryPath);
    return {
      cmd: command.cmd,
      repository: GitHelper.repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: []
      }
    };
  }

  private static async statusHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const statuses = await repository.getStatus();
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: statuses.map(status => {
          return JSON.stringify({
            file: status.path(),
            status: this.fileStatusToText(status)
          });
        })
      }
    };
    return reply;
  }

  private static async changesHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const commit = await repository.getCommit(command.args[0]);
    const diffs = await commit.getDiff();
    const files: Array<string> = [];
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const patches = await diff.patches();
      patches.forEach(patch => {
        files.push(
          JSON.stringify({
            file: patch.newFile().path(),
            status: this.patchStatusToText(patch)
          })
        );
      });
    }
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: files
      }
    };
    return reply;
  }

  private static async diffHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const commit1 = await repository.getCommit(command.args[0]);
    const tree1 = await commit1.getTree();
    const commit2 = await repository.getCommit(command.args[1]);
    const tree2 = await commit2.getTree();
    const diff = await Git.Diff.treeToTree(repository, tree2, tree1);
    const patches = await diff.patches();
    const files = patches.map(patch => {
      return JSON.stringify({
        file: patch.newFile().path(),
        status: this.patchStatusToText(patch)
      });
    });
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: files
      }
    };
    return reply;
  }

  private static async logHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const commit = await repository.getMasterCommit();
    const historyCommits = await this.getHistoryCommits(commit);
    const data = historyCommits.map(historyCommit => {
      return JSON.stringify({
        sha: historyCommit.sha(),
        msg: historyCommit.message(),
        author: historyCommit.author().name(),
        timestamp: historyCommit.date().getTime()
      });
    });
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: data
      }
    };
    return reply;
  }

  private static async stageHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const index = await repository.refreshIndex();
    for (let i = 0; i < command.args.length; i++) {
      const file = command.args[i];
      await index.addByPath(file);
    }
    index.write();
    const oid = await index.writeTree();
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: [oid.tostrS()]
      }
    };
    return reply;
  }

  private static async compareHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const filePath = command.args[0];
    const newCommitSha = command.args[1];
    const oldCommitSha = command.args[2];
    let oldContent: string;
    let newContent: string;
    if (newCommitSha) {
      newContent = await this.getFileContentAtCommit(
        filePath,
        await repository.getCommit(newCommitSha)
      );
      if (oldCommitSha) {
        oldContent = await this.getFileContentAtCommit(
          filePath,
          await repository.getCommit(oldCommitSha)
        );
      } else {
        oldContent = '';
      }
    } else {
      const commit = await repository.getHeadCommit();
      oldContent = await this.getFileContentAtCommit(filePath, commit);
      newContent = this.getFileContent(
        path.resolve(repository.path(), '..', filePath)
      );
    }

    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: [oldContent, newContent]
      }
    };
    return reply;
  }

  private static async getFileContentAtCommit(filePath: string, commit: Git.Commit) {
    let content;
    try {
      const entry = await commit.getEntry(filePath);
      const blob = await entry.getBlob();
      content = blob.toString();
    } catch (error) {
      content = '';
    }
    return content;
  }

  private static getFileContent(filePath: string) {
    let content;
    try {
      content = readFileSync(filePath).toString('utf-8');
    } catch (error) {
      content = '';
    }
    return content;
  }

  private static async commitHandler(command: IGitCommand, repository: Git.Repository): Promise<IGitResult> {
    let reply: IGitResult;
    const head = await repository.getHeadCommit();
    const signature = repository.defaultSignature();
    const index = await repository.refreshIndex();
    const oid = await index.writeTree();
    const commitId = await repository.createCommit(
      'HEAD',
      signature,
      signature,
      command.args[0],
      oid,
      [head]
    );
    reply = {
      cmd: command.cmd,
      repository: repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: [commitId.tostrS()]
      }
    };
    return reply;
  }

  private static getHistoryCommits(
    startCommit: Git.Commit
  ): Promise<Array<Git.Commit>> {
    const commits: Array<Git.Commit> = [];
    return new Promise((resolve, reject) => {
      const history = startCommit.history();
      history.on('commit', function(commit: Git.Commit) {
        commits.push(commit);
      });
      history.on('end', function(commit: Git.Commit) {
        resolve(commits);
      });
      history.start();
    });
  }
}
