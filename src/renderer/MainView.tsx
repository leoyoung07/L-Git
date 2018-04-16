import { ipcRenderer } from 'electron';
import React from 'react';

interface IProps {

}

interface IState {
  request: string;
  response: string;
}
class MainView extends React.Component<IProps, IState> {
  constructor (props: IProps) {
    super(props);
    this.handlePingButtonClick = this.handlePingButtonClick.bind(this);
    this.state = {
      request: '',
      response: ''
    };

    ipcRenderer.on('async-reply', (event: Electron.Event, arg?: string) => {
      if (arg) {
        this.setState({
          response: arg
        });
      }
    });
  }
  render() {
    return (
      <div>
        <h1>Request: {this.state.request}</h1>
        <h1>Response: {this.state.response}</h1>
        <button onClick={this.handlePingButtonClick}>ping!</button>
      </div>
    );
  }

  private handlePingButtonClick (e: React.MouseEvent<HTMLButtonElement>) {
    const request = 'ping';
    ipcRenderer.send('async-msg', request);
    this.setState({
      request: request,
      response: ''
    });
  }
}

export default MainView;
