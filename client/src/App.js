import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NeighborhoodMap from './Map';       // ✅ renamed import
import AdminMap from './AdminMap';         // admin-only view
import SubmissionsViewer from './SubmissionsViewer'; // ✅ new viewer component
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Public-facing mapping flow */}
          <Route path="/" element={<NeighborhoodMap />} />

          {/* Private admin view (only you know this route) */}
          <Route path="/admin" element={<AdminMap />} />

          {/* Viewer for all submissions */}
          <Route path="/submissions" element={<SubmissionsViewer />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
