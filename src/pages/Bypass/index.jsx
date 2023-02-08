import React from 'react';
import { render } from 'react-dom';

import Bypass from './Bypass';
import '../../assets/styles/tailwind.css';

render(<Bypass />, window.document.querySelector('#app-container'));

if (module.hot) module.hot.accept();
