import CodeMirror from 'codemirror';
import 'codemirror/addon/merge/merge';
import { ipcRenderer, remote } from 'electron';
import moment from 'moment';
import React from 'react';
import {
  COMMAND_STATE,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitCommit,
  IGitResult
} from '../ipc_common/constants';
import './MainView.scss';

interface IProps {}

interface IState {
  error: string;
  repositoryName: string;
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

interface ILogViewProps {
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;

  handleLogItemClick: (
    commit: string,
    e: React.MouseEvent<HTMLElement>
  ) => void;
}

const LogView = (props: ILogViewProps) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Message</th>
          <th>Author</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {props.logs.map(log => {
          let background;
          const commit = JSON.parse(log) as IGitCommit;
          if (commit.sha === props.currentCommit) {
            background = 'red';
          } else if (commit.sha === props.nextCommit) {
            background = 'yellow';
          } else {
            background = 'inherit';
          }
          return (
            <tr
              style={{
                listStyle: 'none',
                cursor: 'pointer',
                background: background
              }}
              key={commit.sha}
              onClick={e => {
                props.handleLogItemClick(commit.sha, e);
              }}
            >
              <td>{commit.msg}</td>
              <td>{commit.author}</td>
              <td>{moment(commit.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
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
    this.handleGitCompareButtonClick = this.handleGitCompareButtonClick.bind(
      this
    );
    this.handleGitCommitButtonClick = this.handleGitCommitButtonClick.bind(
      this
    );
    this.handleCommitMsgInputChange = this.handleCommitMsgInputChange.bind(
      this
    );
    this.handleLogItemClick = this.handleLogItemClick.bind(this);
    this.handleStatusItemClick = this.handleStatusItemClick.bind(this);
    this.state = {
      error: '',
      repositoryName: '',
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
            repositoryName: this.getRepositoryName(reply.repository),
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
    this.gitLog();
  }
  render() {
    return (
      <div className="main-view__wrapper">
        <div className="grid">
          <div className="grid-item-1">
            <button onClick={this.handleGitOpenButtonClick}>Open</button>
            <span>{this.state.repositoryName}</span>
          </div>
          <div className="grid-item-2">
            <button onClick={this.handleGitStatusButtonClick}>Status</button>
            <button
              disabled={!this.state.currentCommit}
              onClick={this.handleGitChangesButtonClick}
            >
              Changes
            </button>
            <button
              disabled={!this.state.currentCommit || !this.state.nextCommit}
              onClick={this.handleGitDiffButtonClick}
            >
              Diff
            </button>
            <button
              disabled={
                !this.state.selectedFiles ||
                this.state.selectedFiles.length <= 0
              }
              onClick={this.handleGitStageButtonClick}
            >
              Stage
            </button>
            <button
              disabled={!this.state.repositoryPath}
              onClick={this.handleGitLogButtonClick}
            >
              Log
            </button>
            <button
              disabled={this.state.selectedFiles.length <= 0}
              onClick={this.handleGitCompareButtonClick}
            >
              Compare
            </button>
            <input
              type="text"
              value={this.state.commitMsg}
              onChange={this.handleCommitMsgInputChange}
            />
            <button
              disabled={!this.state.commitMsg}
              onClick={this.handleGitCommitButtonClick}
            >
              Commit
            </button>
          </div>
          <div className="grid-item-3">
            <LogView
              currentCommit={this.state.currentCommit}
              nextCommit={this.state.nextCommit}
              logs={this.state.logs}
              handleLogItemClick={this.handleLogItemClick}
            />
          </div>
          <div className="grid-item-4">
            {this.state.status.length > 0 ? (
              <ul className="changes-list">
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
            ) : null}
            {this.state.changes.length > 0 ? (
              <ul className="changes-list">
                {this.state.changes.map((change, index) => {
                  return (
                    <li style={{ listStyle: 'none' }} key={index}>
                      {change}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div id="compareView" className="compare-view" />
          </div>
        </div>
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
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
        </div>
      </div>
    );
  }

  private getRepositoryName(repositoryPath: string) {
    const matches = /([^\/\\]+)[\/\\]?(\.git[\/\\]?)?$/gi.exec(repositoryPath);
    if (matches && matches.length > 1) {
      return matches[1];
    }
    return '';
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
      info: '',
      status: [],
      changes: []
    });
  }

  private handleGitOpenButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    remote.dialog.showOpenDialog(
      {
        defaultPath: process.cwd(),
        properties: ['openDirectory']
      },
      filePaths => {
        if (filePaths.length > 0) {
          this.gitOpen(filePaths[0]);
        }
      }
    );
  }

  private gitOpen(openPath: string) {
    const command = {
      cmd: GIT_COMMANDS.OPEN,
      args: [openPath],
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
      info: '',
      status: [],
      changes: []
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
    this.gitLog();
  }

  private gitLog() {
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
    this.gitCompare();
  }

  private gitCompare() {
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
        this.setState(
          {
            currentCommit: commit
          },
          () => {
            this.gitChanges();
          }
        );
      } else {
        this.setState(
          {
            nextCommit: commit
          },
          () => {
            this.gitDiff();
          }
        );
      }
    } else {
      this.setState(
        {
          currentCommit: commit,
          nextCommit: null
        },
        () => {
          this.gitChanges();
        }
      );
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
      this.setState(
        {
          selectedFiles: [file]
        },
        () => {
          this.gitCompare();
        }
      );
    }
  }

  private handleGitOpenReply(reply: IGitResult) {
    this.setState({
      error: '',
      info: 'Current Repository: ' + reply.repository
    });
    this.gitStatus();
    this.gitLog();
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
    const $compareView = document.getElementById('compareView');
    if ($compareView) {
      $compareView.innerHTML = '';
      CodeMirror.MergeView($compareView, {
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
