import { ipcRenderer } from 'electron';
import React from 'react';
import {
  COMMAND_STATE,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitResult
} from '../ipc_common/constants';

interface IProps {}

interface IState {
  error: string;

  openPath: string;
  repositoryPath: string;
  request: string;
  response: Array<string>;
}
class MainView extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.handleGitStatusButtonClick = this.handleGitStatusButtonClick.bind(
      this
    );
    this.handleGitOpenButtonClick = this.handleGitOpenButtonClick.bind(this);
    this.handlePathInputChange = this.handlePathInputChange.bind(this);
    this.state = {
      error: '',
      openPath: process.cwd(),
      repositoryPath: '',
      request: '',
      response: []
    };

    ipcRenderer.on('git-result', (event: Electron.Event, msg?: string) => {
      if (msg) {
        const reply = JSON.parse(msg) as IGitResult;
        if (reply.result.state === COMMAND_STATE.SUCCESS) {
          this.setState({
            error: '',
            repositoryPath: reply.repository,
            response: reply.result.data
          });
        } else {
          this.setState({
            error: reply.result.data[0],
            response: []
          });
        }
      }
    });
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
          <button onClick={this.handleGitOpenButtonClick}>Git Open</button>
        </div>
        <div>
          <button onClick={this.handleGitStatusButtonClick}>Git Status</button>
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

  private handlePathInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      openPath: e.target.value
    });
  }
}

export default MainView;
