import CodeMirror from 'codemirror';
import 'codemirror/addon/merge/merge';
import { ipcRenderer, remote } from 'electron';
import React from 'react';
import {
  COMMAND_STATE,
  ERRORS,
  GIT_COMMANDS,
  GIT_STATUS,
  IGitCommand,
  IGitCommit,
  IGitResult,
  IGitStatus
} from '../ipc_common/constants';
import ChangesView from './ChangesView';
import ClickOutside from './ClickOutside';
import LogView from './LogView';
import './MainView.scss';
import Popup from './Popup';

interface IProps {}

interface IState {
  repositoryName: string;
  repositoryPath: string;
  currentCommit: string | null;
  nextCommit: string | null;
  logs: Array<IGitCommit>;
  changes: Array<IGitStatus>;
  status: Array<IGitStatus>;
  selectedFiles: Array<string>;
  recentRepositories: Array<string>;
  commitMsg: string;
  popupMsg: string;
  popupTitle: string;
  isPopupVisible: boolean;
  gridTemplateColumns: string;
  logViewWidth: number;
  onPopupOk?: () => void;
  onPopupCancel?: () => void;
}

class MainView extends React.Component<IProps, IState> {
  private openViewRef = React.createRef<HTMLDivElement>();
  private compareViewRef = React.createRef<HTMLDivElement>();
  constructor(props: IProps) {
    super(props);
    this.bindEventHandlers();
    this.initState();
    this.registerIpcReplyHandlers();
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
          style={{ gridTemplateColumns: this.state.gridTemplateColumns }}
        >
          <div className="grid-item-1" ref={this.openViewRef}>
            <button onClick={this.handleGitRecentReposButtonClick}>
              Recent Repositories
            </button>
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
            <ClickOutside onClickOutside={this.handleLogViewClickOutside}>
              <LogView
                currentCommit={this.state.currentCommit}
                nextCommit={this.state.nextCommit}
                logs={this.state.logs}
                handleLogItemClick={this.handleLogItemClick}
                handleWidthChange={this.handleLogViewWidthChange}
              />
            </ClickOutside>
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
            <div className="compare-view" ref={this.compareViewRef}/>
          </div>
          <div
            className="grid-item-5"
            onDoubleClick={this.handlePanelSplitDBClick}
          />
        </div>
        <Popup
          popupTitle={this.state.popupTitle}
          popupMsg={this.state.popupMsg}
          onPopupOk={this.state.onPopupOk}
          onPopupCancel={this.state.onPopupCancel}
          visible={this.state.isPopupVisible}
          okText="New Repository"
        >
          <ul>
            {this.state.recentRepositories.map((repository, index) => {
              return (
                <li
                  key={repository}
                  style={{
                    cursor: 'pointer',
                    listStyle: 'none',
                    lineHeight: '25px',
                    marginBottom: '5px',
                    textAlign: 'left'
                  }}
                  onClick={e => {
                    this.handleRecentRepoItemClick(repository, e);
                  }}
                >
                  {repository}
                </li>
              );
            })}
          </ul>
        </Popup>
      </div>
    );
  }

  private bindEventHandlers() {
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
    this.handleChangesItemClick = this.handleChangesItemClick.bind(this);
    this.handlePanelSplitDBClick = this.handlePanelSplitDBClick.bind(this);
    this.handleLogViewWidthChange = this.handleLogViewWidthChange.bind(this);
    this.handleResultError = this.handleResultError.bind(this);
    this.handleGitRecentReposButtonClick = this.handleGitRecentReposButtonClick.bind(
      this
    );
    this.handleRecentRepoItemClick = this.handleRecentRepoItemClick.bind(this);
    this.handleLogViewClickOutside = this.handleLogViewClickOutside.bind(this);
  }

  private initState() {
    this.state = {
      repositoryName: '',
      repositoryPath: '',
      currentCommit: null,
      nextCommit: null,
      logs: [],
      changes: [],
      status: [],
      selectedFiles: [],
      recentRepositories: [],
      commitMsg: '',
      popupMsg: '',
      popupTitle: '',
      isPopupVisible: false,
      gridTemplateColumns: '',
      logViewWidth: 0,
      onPopupCancel: () => {
        this.setState({
          isPopupVisible: false
        });
      }
    };
  }

  private registerIpcReplyHandlers() {
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
            case GIT_COMMANDS.RECENT_REPOS:
              this.handleGitRecentReposReply(reply);
              break;
            default:
              this.handleUnknownReply(reply);
              break;
          }
        } else {
          this.handleResultError(reply);
        }
        // tslint:disable-next-line:no-console
        console.log(msg);
      }
    });
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

  private handleGitOpenButtonClick(
    e: React.MouseEvent<HTMLButtonElement> | null
  ) {
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

  private handleGitRecentReposButtonClick(
    e: React.MouseEvent<HTMLButtonElement> | null
  ) {
    const command = {
      cmd: GIT_COMMANDS.RECENT_REPOS,
      args: [],
      cwd: process.cwd()
    };
    const request = JSON.stringify(command);
    ipcRenderer.send('git-command', request);
  }

  private handleRecentRepoItemClick(
    repository: string,
    e: React.MouseEvent<HTMLElement> | null
  ) {
    this.gitOpen(repository);
    this.setState({
      isPopupVisible: false
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
      let oldCommitSha: string | undefined;
      if (this.state.nextCommit) {
        oldCommitSha = this.state.nextCommit;
      } else {
        const newCommitIndex = this.state.logs.findIndex(value => {
          return value.sha === newCommitSha;
        });
        const oldCommit = this.state.logs[newCommitIndex + 1];
        oldCommitSha = oldCommit ? oldCommit.sha : undefined;
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
    const status = reply.result.data.map(statusStr => {
      return JSON.parse(statusStr) as IGitStatus;
    });
    this.setState({
      status: status
    });
  }

  private handleGitChangesReply(reply: IGitResult) {
    const changes = reply.result.data.map(changeStr => {
      return JSON.parse(changeStr) as IGitStatus;
    });
    this.setState({
      changes: changes
    });
  }

  private handleGitDiffReply(reply: IGitResult) {
    const changes = reply.result.data.map(changeStr => {
      return JSON.parse(changeStr) as IGitStatus;
    });
    this.setState({
      changes: changes
    });
  }

  private handleGitLogReply(reply: IGitResult) {
    const logs = reply.result.data.map(logStr => {
      return JSON.parse(logStr) as IGitCommit;
    });
    this.setState({
      logs: logs
    });
  }

  private handleGitStageReply(reply: IGitResult) {
    this.gitStatus();
  }

  private handleGitCompareReply(reply: IGitResult) {
    const $compareView = this.compareViewRef.current;
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

  private handleGitRecentReposReply(reply: IGitResult) {
    this.setState({
      popupMsg: '',
      popupTitle: 'Recent Repositories',
      recentRepositories: reply.result.data,
      isPopupVisible: true,
      onPopupOk: () => {
        this.handleGitOpenButtonClick(null);
        this.setState({
          isPopupVisible: false
        });
      }
    });
  }

  private handleUnknownReply(reply: IGitResult) {
    this.setState({
      popupMsg: 'UNKNOWN COMMAND',
      popupTitle: 'Error',
      isPopupVisible: true
    });
  }

  private handlePanelSplitDBClick(e: React.MouseEvent<HTMLElement>) {
    const scrollBarWidth = 20;
    const width = this.state.logViewWidth + scrollBarWidth;
    this.setState({
      gridTemplateColumns: `${width}px 1px 1fr`
    });
  }

  private handleLogViewWidthChange(oldWidth: number, newWidth: number) {
    this.setState({
      logViewWidth: newWidth
    });
  }

  private handleResultError(reply: IGitResult) {
    const errCode = reply.result.data[0];
    const errMsg = reply.result.data[1];
    if (errCode === ERRORS.E001.code) {
      this.handleGitRecentReposButtonClick(null);
    } else {
      this.setState({
        popupMsg: errMsg,
        popupTitle: errCode,
        isPopupVisible: true,
        onPopupOk: () => {
          this.setState({
            isPopupVisible: false
          });
        }
      });
    }
  }

  private handleLogViewClickOutside(e: MouseEvent) {
    if (this.openViewRef && this.openViewRef.current) {
      if (this.openViewRef.current.contains(e.target as Node)) {
        this.setState({
          currentCommit: null,
          nextCommit: null,
          changes: [],
          selectedFiles: []
        });
        if (this.compareViewRef.current) {
          this.compareViewRef.current.innerHTML = '';
        }
      }
    }
  }
}

export default MainView;
