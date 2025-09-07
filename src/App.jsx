import React from 'react';
import ShamsiCalendarWidget from './ShamsiCalendarWidget.jsx'; // Assuming the widget file is in the same src folder
import './index.css'; // Importing global styles

function App() {
  // This component simply renders your Shamsi Calendar Widget.
  // The widget itself will handle its entire layout and functionality.
  return (
    <div className="app-container">
      <ShamsiCalendarWidget />
    </div>
  );
}

export default App;
