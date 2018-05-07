import CodeMirror from 'codemirror';
import 'codemirror/addon/merge/merge';
import 'codemirror/mode/javascript/javascript';
import { ipcRenderer, remote } from 'electron';
import React from 'react';
import {
  COMMAND_STATE,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitResult
} from '../ipc_common/constants';
import './MainView.scss';

interface IProps {}

interface IState {
  error: string;

  openPath: string;
  repositoryPath: string;
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;
  changes: Array<string>;
  status: Array<string>;
  selectedFiles: Array<string>;
  info: string;
  commitMsg: string;
}
class MainView extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.handleGitStatusButtonClick = this.handleGitStatusButtonClick.bind(
      this
    );
    this.handleGitOpenButtonClick = this.handleGitOpenButtonClick.bind(this);
    this.handleGitChangesButtonClick = this.handleGitChangesButtonClick.bind(
      this
    );
    this.handleGitDiffButtonClick = this.handleGitDiffButtonClick.bind(this);
    this.handleGitLogButtonClick = this.handleGitLogButtonClick.bind(this);
    this.handleGitStageButtonClick = this.handleGitStageButtonClick.bind(this);
    this.handlePathInputChange = this.handlePathInputChange.bind(this);
    this.handleGitCompareButtonClick = this.handleGitCompareButtonClick.bind(
      this
    );
    this.handleGitCommitButtonClick = this.handleGitCommitButtonClick.bind(
      this
    );
    this.handleCommitMsgInputChange = this.handleCommitMsgInputChange.bind(this);
    this.state = {
      error: '',
      openPath: process.cwd(),
      repositoryPath: '',
      currentCommit: null,
      nextCommit: null,
      logs: [],
      changes: [],
      status: [],
      selectedFiles: [],
      info: '',
      commitMsg: ''
    };

    ipcRenderer.on('git-result', (event: Electron.Event, msg?: string) => {
      if (msg) {
        const reply = JSON.parse(msg) as IGitResult;
        if (reply.result.state === COMMAND_STATE.SUCCESS) {
          this.setState({
            repositoryPath: reply.repository
          });
          switch (reply.cmd) {
            case GIT_COMMANDS.OPEN:
              this.handleGitOpenReply(reply);
              break;
            case GIT_COMMANDS.LOG:
              this.handleGitLogReply(reply);
              break;
            case GIT_COMMANDS.STATUS:
              this.handleGitStatusReply(reply);
              break;
            case GIT_COMMANDS.CHANGES:
              this.handleGitChangesReply(reply);
              break;
            case GIT_COMMANDS.DIFF:
              this.handleGitDiffReply(reply);
              break;
            case GIT_COMMANDS.STAGE:
              this.handleGitStageReply(reply);
              break;
            case GIT_COMMANDS.COMPARE:
              this.handleGitCompareReply(reply);
              break;
            case GIT_COMMANDS.COMMIT:
              this.handleGitCommitReply(reply);
              break;
            default:
              this.handleUnknownReply(reply);
              break;
          }
        } else {
          this.setState({
            error: reply.result.data[0]
          });
        }
        // tslint:disable-next-line:no-console
        console.log(msg);
      }
    });
  }

  componentDidMount() {
    this.gitStatus();
  }
  render() {
    return (
      <div>
        <div>
          <input
            type="text"
            value={this.state.openPath}
            onChange={this.handlePathInputChange}
          />
          <button onClick={this.handleGitOpenButtonClick}>Open</button>
        </div>
        <div>
          <button onClick={this.handleGitStatusButtonClick}>Status</button>
        </div>
        <div>
          <button
            disabled={!this.state.currentCommit}
            onClick={this.handleGitChangesButtonClick}
          >
            Changes
          </button>
        </div>
        <div>
          <button
            disabled={!this.state.currentCommit || !this.state.nextCommit}
            onClick={this.handleGitDiffButtonClick}
          >
            Diff
          </button>
        </div>
        <div>
          <button
            disabled={
              !this.state.selectedFiles || this.state.selectedFiles.length <= 0
            }
            onClick={this.handleGitStageButtonClick}
          >
            Stage
          </button>
        </div>
        <div>
          <button
            disabled={!this.state.repositoryPath}
            onClick={this.handleGitLogButtonClick}
          >
            Log
          </button>
        </div>
        <div>
          <button
            disabled={this.state.selectedFiles.length <= 0}
            onClick={this.handleGitCompareButtonClick}
          >
            Compare
          </button>
        </div>
        <div>
          <input type="text" value={this.state.commitMsg} onChange={this.handleCommitMsgInputChange}/>
          <button
            disabled={!this.state.commitMsg}
            onClick={this.handleGitCommitButtonClick}
          >
            Commit
          </button>
        </div>
        {this.state.error ? (
          <div>
            <h1>Error: </h1>
            <span>{this.state.error}</span>
          </div>
        ) : null}
        {this.state.info ? (
          <div>
            <h1>Info: </h1>
            <span>{this.state.info}</span>
          </div>
        ) : null}
        <h1>Repository: </h1>
        <p>{this.state.repositoryPath}</p>
        <h1>Status: </h1>
        <ul>
          {this.state.status.map((status, index) => {
            let background;
            const file = status.split(' ')[0];
            if (this.state.selectedFiles.indexOf(file) < 0) {
              background = 'inherit';
            } else {
              background = 'cyan';
            }
            return (
              <li
                style={{
                  listStyle: 'none',
                  cursor: 'pointer',
                  background: background
                }}
                key={index}
                onClick={this.handleStatusItemClick.bind(this, file)}
              >
                {status}
              </li>
            );
          })}
        </ul>
        <h1>Logs: </h1>
        <ul>
          {this.state.logs.map(commit => {
            let background;
            if (commit === this.state.currentCommit) {
              background = 'red';
            } else if (commit === this.state.nextCommit) {
              background = 'yellow';
            } else {
              background = 'inherit';
            }
            return (
              <li
                style={{
                  listStyle: 'none',
                  cursor: 'pointer',
                  background: background
                }}
                key={commit}
                onClick={this.handleLogItemClick.bind(this, commit)}
              >
                {commit}
              </li>
            );
          })}
        </ul>
        <h1>Changes: </h1>
        <ul>
          {this.state.changes.map((change, index) => {
            return (
              <li style={{ listStyle: 'none' }} key={index}>
                {change}
              </li>
            );
          })}
        </ul>
        <h1>Compare: </h1>
        <div id="mergeView" />
      </div>
    );
  }

  private handleGitStatusButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    this.gitStatus();
  }

  private gitStatus() {
    const command = {
      cmd: GIT_COMMANDS.STATUS,
      args: [],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitOpenButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    remote.dialog.showOpenDialog(
      {
        defaultPath: this.state.openPath,
        properties: ['openDirectory']
      },
      filePaths => {
        if (filePaths.length > 0) {
          this.setState(
            {
              openPath: filePaths[0]
            },
            () => {
              this.gitOpen();
            }
          );
        }
      }
    );
  }

  private gitOpen() {
    const command = {
      cmd: GIT_COMMANDS.OPEN,
      args: [this.state.openPath],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitChangesButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    this.gitChanges();
  }

  private gitChanges() {
    const command = {
      cmd: GIT_COMMANDS.CHANGES,
      args: [this.state.currentCommit],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitDiffButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    this.gitDiff();
  }

  private gitDiff() {
    const command = {
      cmd: GIT_COMMANDS.DIFF,
      args: [this.state.currentCommit, this.state.nextCommit],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitLogButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const command = {
      cmd: GIT_COMMANDS.LOG,
      args: [],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitStageButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const command = {
      cmd: GIT_COMMANDS.STAGE,
      args: this.state.selectedFiles,
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
    this.setState({
      error: '',
      info: ''
    });
  }

  private handleGitCompareButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (this.state.selectedFiles.length > 0) {
      const command = {
        cmd: GIT_COMMANDS.COMPARE,
        args: [this.state.selectedFiles[0]],
        cwd: process.cwd()
      };
      const request = JSON.stringify(command);
      ipcRenderer.send('git-command', request);
      this.setState({
        error: '',
        info: ''
      });
    }
  }

  private handleGitCommitButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (this.state.commitMsg) {
      const command = {
        cmd: GIT_COMMANDS.COMMIT,
        args: [this.state.commitMsg],
        cwd: process.cwd()
      };
      const request = JSON.stringify(command);
      ipcRenderer.send('git-command', request);
      this.setState({
        error: '',
        info: ''
      });
    }
  }

  private handlePathInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      openPath: e.target.value
    });
  }

  private handleCommitMsgInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      commitMsg: e.target.value
    });
  }

  private handleLogItemClick(commit: string, e: React.MouseEvent<HTMLElement>) {
    if (e.ctrlKey) {
      if (commit === this.state.currentCommit) {
        this.setState({
          currentCommit: null
        });
      } else if (commit === this.state.nextCommit) {
        this.setState({
          nextCommit: null
        });
      } else if (this.state.currentCommit === null) {
        this.setState({
          currentCommit: commit
        }, () => {
          this.gitChanges();
        });
      } else {
        this.setState({
          nextCommit: commit
        }, () => {
          this.gitDiff();
        });
      }
    } else {
      this.setState({
        currentCommit: commit,
        nextCommit: null
      }, () => {
        this.gitChanges();
      });
    }
  }

  private handleStatusItemClick(
    file: string,
    e: React.MouseEvent<HTMLElement>
  ) {
    if (e.ctrlKey) {
      let selectedFiles = this.state.selectedFiles.slice();
      const index = selectedFiles.indexOf(file);
      if (index < 0) {
        selectedFiles.push(file);
      } else {
        selectedFiles.splice(index, 1);
      }
      this.setState({
        selectedFiles: selectedFiles
      });
    } else {
      this.setState({
        selectedFiles: [file]
      });
    }
  }

  private handleGitOpenReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: 'Current Repository: ' + reply.repository
    });
    this.gitStatus();
  }

  private handleGitStatusReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: '',
      status: reply.result.data
    });
  }

  private handleGitChangesReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: '',
      changes: reply.result.data
    });
  }

  private handleGitDiffReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: '',
      changes: reply.result.data
    });
  }

  private handleGitLogReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: '',
      logs: reply.result.data
    });
  }

  private handleGitStageReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: reply.result.data[0] || ''
    });
    this.gitStatus();
  }

  private handleGitCompareReply(reply: IGitResult) {
    const $mergeView = document.getElementById('mergeView');
    if ($mergeView) {
      $mergeView.innerHTML = '';
      CodeMirror.MergeView($mergeView, {
        value: reply.result.data[0],
        orig: reply.result.data[1]
      });
    }
  }

  private handleGitCommitReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: ''
    });
    this.gitStatus();
  }

  private handleUnknownReply(reply: IGitResult) {
    this.setState({
      error: 'UNKNOWN COMMAND',
      info: ''
    });
  }
}

export default MainView;
