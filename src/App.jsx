import React, { useEffect } from 'react';
import ShamsiCalendarWidget from './shamsi_calendar_widget';
import './index.css';

function App() {
  useEffect(() => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const { ipcRenderer } = window.require ? window.require('electron') : {};

    const handleMouseDown = (e) => {
      isDragging = true;
      startX = e.screenX;
      startY = e.screenY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.screenX - startX;
      const deltaY = e.screenY - startY;
      startX = e.screenX;
      startY = e.screenY;

      if (ipcRenderer) {
        ipcRenderer.send('window-drag', deltaX, deltaY);
      }
    };

    document.body.addEventListener('mousedown', handleMouseDown);
    document.body.addEventListener('mouseup', handleMouseUp);
    document.body.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.body.removeEventListener('mousedown', handleMouseDown);
      document.body.removeEventListener('mouseup', handleMouseUp);
      document.body.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="widget-container">
        <ShamsiCalendarWidget />
      </div>
    </div>
  );
}

export default App;


