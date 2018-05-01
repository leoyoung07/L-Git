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
  request: string;
  response: Array<string>;
  code: string;
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;
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
    this.handlePathInputChange = this.handlePathInputChange.bind(this);
    this.updateCode = this.updateCode.bind(this);
    this.state = {
      error: '',
      openPath: process.cwd(),
      repositoryPath: '',
      request: '',
      response: [],
      code: '// Code',
      currentCommit: null,
      nextCommit: null,
      logs: []
    };

    ipcRenderer.on('git-result', (event: Electron.Event, msg?: string) => {
      if (msg) {
        const reply = JSON.parse(msg) as IGitResult;
        if (reply.result.state === COMMAND_STATE.SUCCESS) {
          if (reply.cmd === GIT_COMMANDS.LOG) {
            this.setState({
              error: '',
              repositoryPath: reply.repository,
              logs: reply.result.data
            });
          } else {
            this.setState({
              error: '',
              repositoryPath: reply.repository,
              response: reply.result.data
            });
          }
        } else {
          this.setState({
            error: reply.result.data[0],
            response: []
          });
        }
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
          <button onClick={this.handleGitOpenButtonClick}>Git Open</button>
        </div>
        <div>
          <button onClick={this.handleGitStatusButtonClick}>Git Status</button>
        </div>
        <div>
          <button
            disabled={!this.state.currentCommit}
            onClick={this.handleGitChangesButtonClick}
          >
            Git Changes
          </button>
        </div>
        <div>
          <button
            disabled={!this.state.currentCommit || !this.state.nextCommit}
            onClick={this.handleGitDiffButtonClick}
          >
            Git Diff
          </button>
        </div>
        <div>
          <button onClick={this.handleGitLogButtonClick}>Git Log</button>
        </div>
        <h1>Request: </h1>
        <p>{this.state.request}</p>
        {this.state.error ? (
          <div>
            <h1>Error: </h1>
            <span>{this.state.error}</span>
          </div>
        ) : null}
        <h1>Response: </h1>
        <ul>
          {this.state.response.map((line, index) => (
            <li style={{ listStyle: 'none' }} key={index}>
              {line}
            </li>
          ))}
        </ul>
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
      request: request,
      response: []
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
      request: request,
      response: []
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
      request: request,
      response: []
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
      request: request,
      response: []
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
      request: request,
      response: []
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
}

export default MainView;
