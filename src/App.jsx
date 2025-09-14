import React from 'react';
import ShamsiCalendarWidget from './shamsi_calendar_widget';
import './index.css';

function App() {
  // useEffect مربوط به drag کاملا حذف شد

  return (
    <div className="app-container">
      <div className="widget-container">
        <ShamsiCalendarWidget />
      </div>
    </div>
  );
}

export default App;