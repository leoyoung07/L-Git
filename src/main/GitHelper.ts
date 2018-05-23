import { ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

interface IData {
  recent: Array<string>;
}
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
              reply = await GitHelper.statusHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.OPEN:
              reply = await GitHelper.openHandler(command);
              break;
            case GIT_COMMANDS.CHANGES:
              reply = await GitHelper.changesHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.DIFF:
              reply = await GitHelper.diffHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.LOG:
              reply = await GitHelper.logHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.STAGE:
              reply = await GitHelper.stageHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.COMPARE:
              reply = await GitHelper.compareHandler(command, GitHelper.repository);
              break;
            case GIT_COMMANDS.COMMIT:
              reply = await GitHelper.commitHandler(command, GitHelper.repository);
              break;
            default:
              reply = {
                cmd: command.cmd,
                repository: GitHelper.repository
                  ? GitHelper.repository.path()
                  : '',
                result: {
                  state: COMMAND_STATE.SUCCESS,
                  data: []
                }
              };
              break;
          }
        } else if (command.cmd === GIT_COMMANDS.OPEN) {
          reply = await GitHelper.openHandler(command);
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
    GitHelper.addToRecentRepository(repositoryPath);
    return {
      cmd: command.cmd,
      repository: GitHelper.repository.path(),
      result: {
        state: COMMAND_STATE.SUCCESS,
        data: []
      }
    };
  }

  private static addToRecentRepository(repositoryPath: string) {
    const data = GitHelper.readFromDataFile();
    const index = data.recent.findIndex(value => value === repositoryPath);
    if (index !== -1) {
      data.recent.splice(index, 1);
    }
    data.recent.unshift(repositoryPath);
    GitHelper.writeToDataFile(data);
  }

  private static readFromDataFile() {
    const tempDir = path.resolve(process.cwd(), '.tmp');
    const dataFilePath = path.resolve(tempDir, 'data.json');
    let data: IData;
    if (existsSync(dataFilePath)) {
      const jsonData = readFileSync(dataFilePath, { encoding: 'utf8' });
      data = JSON.parse(jsonData) as IData;
    } else {
      data = { recent: [] };
    }
    return data;
  }

  private static writeToDataFile(data: IData) {
    const tempDir = path.resolve(process.cwd(), '.tmp');
    const dataFilePath = path.resolve(tempDir, 'data.json');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir);
    }
    writeFileSync(dataFilePath, JSON.stringify(data));
  }

  private static async statusHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
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
            status: GitHelper.fileStatusToText(status)
          });
        })
      }
    };
    return reply;
  }

  private static async changesHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
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
            status: GitHelper.patchStatusToText(patch)
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

  private static async diffHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
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
        status: GitHelper.patchStatusToText(patch)
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

  private static async logHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
    let reply: IGitResult;
    const commit = await repository.getMasterCommit();
    const historyCommits = await GitHelper.getHistoryCommits(commit);
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

  private static async stageHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
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

  private static async compareHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
    let reply: IGitResult;
    const filePath = command.args[0];
    const newCommitSha = command.args[1];
    const oldCommitSha = command.args[2];
    let oldContent: string;
    let newContent: string;
    if (newCommitSha) {
      newContent = await GitHelper.getFileContentAtCommit(
        filePath,
        await repository.getCommit(newCommitSha)
      );
      if (oldCommitSha) {
        oldContent = await GitHelper.getFileContentAtCommit(
          filePath,
          await repository.getCommit(oldCommitSha)
        );
      } else {
        oldContent = '';
      }
    } else {
      const commit = await repository.getHeadCommit();
      oldContent = await GitHelper.getFileContentAtCommit(filePath, commit);
      newContent = GitHelper.getFileContent(
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

  private static async getFileContentAtCommit(
    filePath: string,
    commit: Git.Commit
  ) {
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

  private static async commitHandler(
    command: IGitCommand,
    repository: Git.Repository
  ): Promise<IGitResult> {
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
