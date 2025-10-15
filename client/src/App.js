import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import NeighborhoodMap from './Map';
import AdminMap from './AdminMap';
import SubmissionsViewer from './SubmissionsViewer';
import BlocksViewer from './BlocksViewer';
import Login from './Login';
import PrivateRoute from './PrivateRoute';
import './App.css';

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
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<PrivateRoute><AdminMap /></PrivateRoute>} />
        <Route path="/submissions" element={<PrivateRoute><SubmissionsViewer /></PrivateRoute>} />
        <Route path="/blocks" element={<PrivateRoute><BlocksViewer /></PrivateRoute>} />
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