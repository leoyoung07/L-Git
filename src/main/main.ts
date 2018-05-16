import { resolve as resolveFromRoot } from 'app-root-path';
import { spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import installExtension, {
  ExtensionReference,
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS
} from 'electron-devtools-installer';
import isDev from 'electron-is-dev';
import { readFileSync } from 'fs';
import Git from 'nodegit';
import path from 'path';
import url from 'url';
import {
  COMMAND_STATE,
  ERRORS,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitResult
} from '../ipc_common/constants';

// 保持一个对于 window 对象的全局引用，如果你不这样做，
// 当 JavaScript 对象被垃圾回收， window 会被自动地关闭
let win: BrowserWindow | null;

let repository: Git.Repository;

function createWindow() {
  // 创建浏览器窗口。
  win = new BrowserWindow({ width: 800, height: 600 });

  const devUrl = url.format({
    pathname: 'localhost:1124',
    protocol: 'http:',
    slashes: true
  });
  const prodUrl = url.format({
    pathname: resolveFromRoot('dist/renderer/production/index.html'),
    protocol: 'file:',
    slashes: true
  });
  let indexUrl: string;

  if (isDev) {
    indexUrl = devUrl;
    installDevExtension(REACT_DEVELOPER_TOOLS);
    installDevExtension(REDUX_DEVTOOLS);
    // 打开开发者工具。
    win.webContents.openDevTools();
  } else {
    indexUrl = prodUrl;
  }

  // 然后加载应用的 index.html。
  win.loadURL(indexUrl);

  // 当 window 被关闭，这个事件会被触发。
  win.on('closed', () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    win = null;
  });

  ipcMain.on('git-command', async (event: Electron.Event, msg?: string) => {
    if (msg) {
      const command: IGitCommand = JSON.parse(msg);
      let reply: IGitResult;
      if (!repository && command.cmd !== GIT_COMMANDS.OPEN) {
        reply = {
          cmd: command.cmd,
          repository: '',
          result: {
            state: COMMAND_STATE.FAIL,
            data: [ERRORS.E001.code, ERRORS.E001.msg]
          }
        };
      } else {
        switch (command.cmd) {
          case GIT_COMMANDS.STATUS:
            reply = await statusHandler(command);
            break;
          case GIT_COMMANDS.OPEN:
            reply = await openHandler(command);
            break;
          case GIT_COMMANDS.CHANGES:
            reply = await changesHandler(command);
            break;
          case GIT_COMMANDS.DIFF:
            reply = await diffHandler(command);
            break;
          case GIT_COMMANDS.LOG:
            reply = await logHandler(command);
            break;
          case GIT_COMMANDS.STAGE:
            reply = await stageHandler(command);
            break;
          case GIT_COMMANDS.COMPARE:
            reply = await compareHandler(command);
            break;
          case GIT_COMMANDS.COMMIT:
            reply = await commitHandler(command);
            break;
          default:
            reply = {
              cmd: command.cmd,
              repository: repository ? repository.path() : '',
              result: {
                state: COMMAND_STATE.SUCCESS,
                data: []
              }
            };
            break;
        }
      }
      event.sender.send('git-result', JSON.stringify(reply));
    }
  });
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow);

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (win === null) {
    createWindow();
  }
});

// 在这文件，你可以续写应用剩下主进程代码。
// 也可以拆分成几个文件，然后用 require 导入。

async function installDevExtension(extension: ExtensionReference) {
  try {
    let name = await installExtension(extension);
    // tslint:disable-next-line:no-console
    console.log(`Added Extension:  ${name}`);
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log('An error occurred: ', error);
  }
}

function fileStatusToText(status: Git.StatusFile) {
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

function patchStatusToText(status: Git.ConvenientPatch) {
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

async function openHandler(command: IGitCommand): Promise<IGitResult> {
  let repositoryPath: string;
  if (command.args.length > 0) {
    repositoryPath = command.args[0];
  } else {
    repositoryPath = command.cwd;
  }
  repository = await Git.Repository.open(repositoryPath);
  return {
    cmd: command.cmd,
    repository: repository.path(),
    result: {
      state: COMMAND_STATE.SUCCESS,
      data: []
    }
  };
}

async function statusHandler(command: IGitCommand): Promise<IGitResult> {
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
          status: fileStatusToText(status)
        });
      })
    }
  };
  return reply;
}

async function changesHandler(command: IGitCommand): Promise<IGitResult> {
  let reply: IGitResult;
  const commit = await repository.getCommit(command.args[0]);
  const diffs = await commit.getDiff();
  const files: Array<string> = [];
  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i];
    const patches = await diff.patches();
    patches.forEach(patch => {
      files.push(JSON.stringify({
        file: patch.newFile().path(),
        status: patchStatusToText(patch)
      }));
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

async function diffHandler(command: IGitCommand): Promise<IGitResult> {
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
      status: patchStatusToText(patch)
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

async function logHandler(command: IGitCommand): Promise<IGitResult> {
  let reply: IGitResult;
  const commit = await repository.getMasterCommit();
  const historyCommits = await getHistoryCommits(commit);
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

async function stageHandler(command: IGitCommand): Promise<IGitResult> {
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

async function compareHandler(command: IGitCommand): Promise<IGitResult> {
  let reply: IGitResult;
  const filePath = command.args[0];
  const newCommitSha = command.args[1];
  const oldCommitSha = command.args[2];
  let oldContent: string;
  let newContent: string;
  if (newCommitSha) {
    newContent = await getFileContentAtCommit(filePath, await repository.getCommit(newCommitSha));
    if (oldCommitSha) {
      oldContent = await getFileContentAtCommit(filePath, await repository.getCommit(oldCommitSha));
    } else {
      oldContent = '';
    }
  } else {
    const commit = await repository.getHeadCommit();
    oldContent = await getFileContentAtCommit(filePath, commit);
    newContent = getFileContent(path.resolve(repository.path(), '..', filePath));
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

async function getFileContentAtCommit(filePath: string, commit: Git.Commit) {
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

function getFileContent(filePath: string) {
  let content;
  try {
    content = readFileSync(filePath).toString('utf-8');
  } catch (error) {
    content = '';
  }
  return content;
}

async function commitHandler(command: IGitCommand): Promise<IGitResult> {
  let reply: IGitResult;
  const head = await repository.getHeadCommit();
  const signature = repository.defaultSignature();
  const index = await repository.refreshIndex();
  const oid = await index.writeTree();
  const commitId = await repository.createCommit('HEAD', signature, signature, command.args[0], oid, [head]);
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

function getHistoryCommits(startCommit: Git.Commit): Promise<Array<Git.Commit>> {
  const commits: Array<Git.Commit> = [];
  return new Promise((resolve, reject) => {
    const history = startCommit.history();
    history.on('commit', function (commit: Git.Commit) {
      commits.push(commit);
    });
    history.on('end', function (commit: Git.Commit) {
      resolve(commits);
    });
    history.start();
  });
}
