import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NeighborhoodMap from './Map';       // Public-facing mapping flow
import AdminMap from './AdminMap';         // Admin-only view
import SubmissionsViewer from './SubmissionsViewer'; // Viewer for all submissions
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<NeighborhoodMap />} />
          <Route path="/admin" element={<AdminMap />} />
          <Route path="/submissions" element={<SubmissionsViewer />} />

          {/* Optional: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;