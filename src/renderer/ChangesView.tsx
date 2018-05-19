import React from 'react';
import { IGitStatus } from '../ipc_common/constants';

interface IChangesViewProps {
  changes: Array<IGitStatus>;
  selectedFiles: Array<string>;
  handleChangesItemClick: (
    file: string,
    e: React.MouseEvent<HTMLElement>
  ) => void;
}

interface IChangesViewState {

}
class ChangesView extends React.Component<IChangesViewProps, IChangesViewState> {
  render() {
    return (
      <ul className="changes-list">
      {this.props.changes.map((fileStatus, index) => {
        let background;
        const file = fileStatus.file;
        if (this.props.selectedFiles.indexOf(file) < 0) {
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
            onClick={e => {
              this.props.handleChangesItemClick(file, e);
            }}
          >
            <span>{file}</span>
            <span>{fileStatus.status}</span>
          </li>
        );
      })}
    </ul>
    );
  }
}

export default ChangesView;
