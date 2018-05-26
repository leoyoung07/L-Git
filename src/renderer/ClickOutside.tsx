import PropTypes from 'prop-types';
import React from 'react';

interface IProps {
  onClickOutside: (e: MouseEvent) => void;
}

interface IState {}

export default class ClickOutside extends React.Component<IProps, IState> {
  static propTypes = {
    onClickOutside: PropTypes.func.isRequired
  };

  private container: HTMLDivElement | null = null;

  constructor(props: IProps) {
    super(props);
    this.handle = this.handle.bind(this);
    this.getContainer = this.getContainer.bind(this);
  }

  getContainer(ref: HTMLDivElement) {
    this.container = ref;
  }

  render() {
    const { children, onClickOutside, ...props } = this.props;
    return (
      <div {...props} ref={this.getContainer}>
        {children}
      </div>
    );
  }

  componentDidMount() {
    document.addEventListener('click', this.handle, true);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handle, true);
  }

  handle(e: MouseEvent) {
    const { onClickOutside } = this.props;
    const el = this.container!;
    if (!el.contains(e.target as Node)) {
      onClickOutside(e);
    }
  }
}
