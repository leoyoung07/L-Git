import CodeMirror from 'codemirror';
import 'codemirror/addon/merge/merge';
import { ipcRenderer, remote } from 'electron';
import React from 'react';
import {
  COMMAND_STATE,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitCommit,
  IGitResult,
  IGitStatus
} from '../ipc_common/constants';
import LogView from './LogView';
import './MainView.scss';

interface IProps {}

interface IState {
  repositoryName: string;
  repositoryPath: string;
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<string>;
  changes: Array<string>;
  status: Array<string>;
  selectedFiles: Array<string>;
  commitMsg: string;
  popupMsg: string;
  popupTitle: string;
  isPopupVisible: boolean;
  gridTemplateColumns: string;
  logViewWidth: number;
}

interface IChangesViewProps {
  changes: Array<string>;
  selectedFiles: Array<string>;
  handleChangesItemClick: (file: string, e: React.MouseEvent<HTMLElement>) => void;
}

const ChangesView = (props: IChangesViewProps) => {
  return (
    <ul className="changes-list">
    {props.changes.map((fileStatusStr, index) => {
      let background;
      const fileStatus = JSON.parse(fileStatusStr) as IGitStatus;
      const file = fileStatus.file;
      if (props.selectedFiles.indexOf(file) < 0) {
        background = 'inherit';
      } else {
        background = 'cyan';
      }
      return (
        <li
          style={{
            listStyle: 'none',
            cursor: 'pointer',
            background: background,
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-between'
          }}
          key={index}
          onClick={(e) => { props.handleChangesItemClick(file, e); }}
        >
          <span>
            {file}
          </span>
          <span>
            {fileStatus.status}
          </span>
        </li>
      );
    })}
  </ul>
  );
};

class MainView extends React.Component<IProps, IState> {

  private logViewRef = React.createRef();
  constructor(props: IProps) {
    super(props);
    // bind event handlers
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
    this.handlePopupCloseClick = this.handlePopupCloseClick.bind(this);
    this.handleLogItemClick = this.handleLogItemClick.bind(this);
    this.handleStatusItemClick = this.handleStatusItemClick.bind(this);
    this.handleChangesItemClick = this.handleChangesItemClick.bind(this);
    this.handlePanelSplitDBClick = this.handlePanelSplitDBClick.bind(this);
    this.handleLogViewWidthChange = this.handleLogViewWidthChange.bind(this);
    // init state
    this.state = {
      repositoryName: '',
      repositoryPath: '',
      currentCommit: null,
      nextCommit: null,
      logs: [],
      changes: [],
      status: [],
      selectedFiles: [],
      commitMsg: '',
      popupMsg: '',
      popupTitle: '',
      isPopupVisible: false,
      gridTemplateColumns: '',
      logViewWidth: 0
    };

    // register ipc reply handlers
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
            popupMsg: reply.result.data[0],
            popupTitle: 'Error',
            isPopupVisible: true
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
        <div
          className="grid"
          style={{gridTemplateColumns: this.state.gridTemplateColumns}}
        >
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
              handleWidthChange={this.handleLogViewWidthChange}
            />
          </div>
          <div className="grid-item-4">
            {this.state.status.length > 0 ? (
              <ChangesView
                changes={this.state.status}
                selectedFiles={this.state.selectedFiles}
                handleChangesItemClick={this.handleStatusItemClick}
              />
            ) : null}
            {this.state.changes.length > 0 ? (
              <ChangesView
                changes={this.state.changes}
                selectedFiles={this.state.selectedFiles}
                handleChangesItemClick={this.handleChangesItemClick}
              />
            ) : null}
            <div id="compareView" className="compare-view" />
          </div>
          <div
            className="grid-item-5"
            onDoubleClick={this.handlePanelSplitDBClick}
          />
        </div>
          {this.state.isPopupVisible ? (
          <div className="popup__mask">
            <div className="popup__wrapper">
              <div className="popup__title">
                <span>{this.state.popupTitle}</span>
                <span
                  className="popup__close"
                  onClick={this.handlePopupCloseClick}
                >
                X
                </span>
              </div>
              <div className="popup__content">
                <span>{this.state.popupMsg}</span>
              </div>
            </div>
          </div>
          ) : null}
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
        if (filePaths && filePaths.length > 0) {
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
  }

  private handleGitStageButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const command = {
      cmd: GIT_COMMANDS.STAGE,
      args: this.state.selectedFiles,
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
  }

  private handleGitCompareButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    this.gitCompare();
  }

  private gitCompare(newCommit?: string, oldCommit?: string) {
    if (this.state.selectedFiles.length > 0) {
      const command = {
        cmd: GIT_COMMANDS.COMPARE,
        args: [this.state.selectedFiles[0], newCommit || '', oldCommit || ''],
        cwd: process.cwd()
      };
      const request = JSON.stringify(command);
      ipcRenderer.send('git-command', request);
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

  private handleChangesItemClick(
    file: string,
    e: React.MouseEvent<HTMLElement>
  ) {
    const newCommitSha = this.state.currentCommit;
    if (newCommitSha) {
      const newCommitIndex =  this.state.logs.findIndex(value => {
        const commit = JSON.parse(value) as IGitCommit;
        return commit.sha === newCommitSha;
      });
      let oldCommitSha: string | undefined;
      if (this.state.nextCommit) {
        oldCommitSha = this.state.nextCommit;
      } else {
        let oldCommitStr: string | undefined;
        if (newCommitIndex >= 0) {
          oldCommitStr = this.state.logs.find((value, index) => index === (newCommitIndex + 1));
        }
        if (oldCommitStr) {
          const oldCommit = JSON.parse(oldCommitStr) as IGitCommit;
          oldCommitSha = oldCommit.sha;
        }
      }
      this.setState(
        {
          selectedFiles: [file]
        },
        () => {
          this.gitCompare(newCommitSha, oldCommitSha);
        }
      );
    }
  }

  private handleGitOpenReply(reply: IGitResult) {
    this.gitStatus();
    this.gitLog();
  }

  private handleGitStatusReply(reply: IGitResult) {
    this.setState({
      status: reply.result.data
    });
  }

  private handleGitChangesReply(reply: IGitResult) {
    this.setState({
      changes: reply.result.data
    });
  }

  private handleGitDiffReply(reply: IGitResult) {
    this.setState({
      changes: reply.result.data
    });
  }

  private handleGitLogReply(reply: IGitResult) {
    this.setState({
      logs: reply.result.data
    });
  }

  private handleGitStageReply(reply: IGitResult) {
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
    this.gitStatus();
  }

  private handleUnknownReply(reply: IGitResult) {
    this.setState({
      popupMsg: 'UNKNOWN COMMAND',
      popupTitle: 'Error',
      isPopupVisible: true
    });
  }

  private handlePopupCloseClick(e: React.MouseEvent<HTMLElement>) {
    this.setState({
      isPopupVisible: false
    });
  }

  private handlePanelSplitDBClick(e: React.MouseEvent<HTMLElement>) {
    const scrollBarWidth = 20;
    const width = this.state.logViewWidth + scrollBarWidth;
    this.setState({
      gridTemplateColumns: `${width}px 1px 1fr`
    });
  }

  private handleLogViewWidthChange (oldWidth: number, newWidth: number) {
    this.setState({
      logViewWidth: newWidth
    });
  }
}

export default MainView;
