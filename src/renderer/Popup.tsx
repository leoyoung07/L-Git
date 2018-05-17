import React from 'react';
import './Popup.scss';

interface IPopupProps {
  popupTitle: string;
  popupMsg: string;
  onPopupOk?: () => void;
  onPopupCancel?: () => void;
  visible: boolean;
}

interface IPopupState {
}
class Popup extends React.Component<IPopupProps, IPopupState> {

  constructor (props: IPopupProps) {
    super(props);
  }
  render() {
    if (this.props.visible) {
      return (
        <div className="popup__mask">
        <div className="popup__wrapper">
          <div className="popup__title">
            <span>{this.props.popupTitle}</span>
            <span
              className="popup__close"
              onClick={(e) => {
                if (this.props.onPopupCancel) {
                  this.props.onPopupCancel();
                }
              }}
            >
              X
            </span>
          </div>
          <div className="popup__content">
            <span>{this.props.popupMsg}</span>
          </div>
          <div className="popup__actions">
            <button
              onClick={e => {
                if (this.props.onPopupOk) {
                  this.props.onPopupOk();
                }
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
      );
    } else {
      return null;
    }
  }
}

export default Popup;
