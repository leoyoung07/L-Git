import CodeMirror from 'codemirror';
import 'codemirror/addon/merge/merge';
import 'codemirror/mode/javascript/javascript';
import { ipcRenderer } from 'electron';
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
  code: string;
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;
  changes: Array<string>;
  selectedFiles: Array<string>;
  info: string;
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
    this.updateCode = this.updateCode.bind(this);
    this.state = {
      error: '',
      openPath: process.cwd(),
      repositoryPath: '',
      code: '// Code',
      currentCommit: null,
      nextCommit: null,
      logs: [],
      changes: [],
      selectedFiles: [],
      info: ''
    };

    ipcRenderer.on('git-result', (event: Electron.Event, msg?: string) => {
      if (msg) {
        const reply = JSON.parse(msg) as IGitResult;
        if (reply.result.state === COMMAND_STATE.SUCCESS) {
          if (reply.cmd === GIT_COMMANDS.OPEN) {
            this.setState({
              repositoryPath: reply.repository
            });
          } else if (reply.cmd === GIT_COMMANDS.LOG) {
            this.setState({
              error: '',
              info: '',
              logs: reply.result.data
            });
          } else if (
            reply.cmd === GIT_COMMANDS.STATUS ||
            reply.cmd === GIT_COMMANDS.CHANGES ||
            reply.cmd === GIT_COMMANDS.DIFF
          ) {
            this.setState({
              error: '',
              info: '',
              changes: reply.result.data
            });
          } else if (reply.cmd === GIT_COMMANDS.STAGE) {
            this.setState({
              error: '',
              info: reply.result.data[0] || ''
            });
          } else {
            this.setState({
              error: 'UNKNOWN COMMAND',
              info: ''
            });
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
    // const $mergeView = document.getElementById('mergeView');
    // if ($mergeView) {
    //   CodeMirror.MergeView($mergeView, {
    //     value: this.state.code,
    //     orig: this.state.code + '...',
    //     origLeft: this.state.code + 'left'
    //   });
    // }
  }
  render() {
    const $code = document.getElementById('code');
    if ($code) {
      $code.innerHTML = '';
      CodeMirror($code, {
        value: this.state.code
      });
    }
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
          <button onClick={this.handleGitLogButtonClick}>Log</button>
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
            let background;
            const file = change.split(' ')[0];
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
                onClick={this.handleChangesItemClick.bind(this, file)}
              >
                {change}
              </li>
            );
          })}
        </ul>
        <div id="code" />
      </div>
    );
  }

  private handleGitStatusButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
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

  private handlePathInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      openPath: e.target.value
    });
  }

  private updateCode(newCode: string) {
    this.setState({
      code: newCode
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
        });
      } else {
        this.setState({
          nextCommit: commit
        });
      }
    } else {
      this.setState({
        currentCommit: commit,
        nextCommit: null
      });
    }
  }

  private handleChangesItemClick(
    change: string,
    e: React.MouseEvent<HTMLElement>
  ) {
    if (e.ctrlKey) {
      let selectedFiles = this.state.selectedFiles.slice();
      const index = selectedFiles.indexOf(change);
      if (index < 0) {
        selectedFiles.push(change);
      } else {
        selectedFiles.splice(index, 1);
      }
      this.setState({
        selectedFiles: selectedFiles
      });
    } else {
      this.setState({
        selectedFiles: [change]
      });
    }
  }
}

export default MainView;
