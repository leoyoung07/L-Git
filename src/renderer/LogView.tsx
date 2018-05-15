import moment from 'moment';
import React from 'react';
import { IGitCommit } from '../ipc_common/constants';
interface ILogViewProps {
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;

  handleLogItemClick: (
    commit: string,
    e: React.MouseEvent<HTMLElement>
  ) => void;

  handleWidthChange: (oldWidth: number, newWidth: number) => void;
}

interface ILogViewState {}
class LogView extends React.Component<ILogViewProps, ILogViewState> {

  private logViewRef: HTMLTableElement | null = null;

  constructor (props: ILogViewProps) {
    super(props);
  }

  shouldComponentUpdate(nextProps: ILogViewProps, nextState: ILogViewState) {
    if (this.props.currentCommit !== nextProps.currentCommit) {
      return true;
    } else if (this.props.nextCommit !== nextProps.nextCommit) {
      return true;
    } else if (this.props.logs !== nextProps.logs) {
      return true;
    } else {
      return false;
    }
  }

  componentDidUpdate(prevProps: ILogViewProps, prevState: ILogViewState) {
    if (this.logViewRef) {
      this.props.handleWidthChange(0, this.logViewRef.scrollWidth);
    }
  }

  render() {
    return (
      <table ref={logView => this.logViewRef = logView}>
        <thead>
          <tr>
            <th>Message</th>
            <th>Author</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {this.props.logs.map(log => {
            let background;
            const commit = JSON.parse(log) as IGitCommit;
            if (commit.sha === this.props.currentCommit) {
              background = 'red';
            } else if (commit.sha === this.props.nextCommit) {
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
                  this.props.handleLogItemClick(commit.sha, e);
                }}
              >
                <td>{commit.msg}</td>
                <td>{commit.author}</td>
                <td>
                  {moment(commit.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
}

export default LogView;
