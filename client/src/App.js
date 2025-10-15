import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import NeighborhoodMap from './Map';               // Public-facing mapping flow
import AdminMap from './AdminMap';                 // Admin-only view
import SubmissionsViewer from './SubmissionsViewer'; // Viewer for all submissions
import BlocksViewer from './BlocksViewer';         // Block-level votes viewer
import './App.css';

// Wrapper to access location inside Router
const AppRoutes = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== '/';

  return (
    <>
      {showNavbar && (
        <nav style={{ padding: '1rem', background: '#f5f5f5' }}>
          <Link to="/" style={{ marginRight: '1rem' }}>Neighborhood Map</Link>
          <Link to="/submissions" style={{ marginRight: '1rem' }}>Submissions Viewer</Link>
          <Link to="/blocks" style={{ marginRight: '1rem' }}>Blocks with Votes</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<NeighborhoodMap />} />
        <Route path="/admin" element={<AdminMap />} />
        <Route path="/submissions" element={<SubmissionsViewer />} />
        <Route path="/blocks" element={<BlocksViewer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <div className="App">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;