import React from 'react';
import ReactDom from 'react-dom';

ReactDom.render(
  <div>
    <h1>
      hello, world
    </h1>
    <h2>Node: {process.versions.node}</h2>
    <h2>Chrome: {process.versions.chrome}</h2>
    <h2>Electron: {process.versions.electron}</h2>
    <h2>Dir: {__dirname}</h2>
    <h2>Url: {window.location.href}</h2>
  </div>,
  document.getElementById('root')
);
