import { ipcRenderer } from 'electron';
import React from 'react';

interface IProps {

}

interface IState {
  request: string;
  response: Array<string>;
}
class MainView extends React.Component<IProps, IState> {
  constructor (props: IProps) {
    super(props);
    this.handleGitStatusButtonClick = this.handleGitStatusButtonClick.bind(this);
    this.state = {
      request: '',
      response: []
    };

    ipcRenderer.on('async-reply', (event: Electron.Event, reply?: string) => {
      if (reply) {
        this.setState({
          response: JSON.parse(reply)
        });
      }
    });
  }
  render() {
    return (
      <div>
        <h1>Request: </h1>
        <p>{this.state.request}</p>
        <h1>Response: </h1>
        <ul>
          {this.state.response.map((line, index) => (
            <li style={{listStyle: 'none'}} key={index}>{line}</li>
          ))}
        </ul>
        <button onClick={this.handleGitStatusButtonClick}>Git Status</button>
      </div>
    );
  }

  private handleGitStatusButtonClick (e: React.MouseEvent<HTMLButtonElement>) {
    const command = {
      cmd: 'git',
      args: ['status'],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('async-msg', request);
    this.setState({
      request: request,
      response: []
    });
  }
}

export default MainView;
