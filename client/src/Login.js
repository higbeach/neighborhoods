// src/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '4115') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin');
    } else {
      alert('Incorrect password');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" style={{ marginLeft: '1rem' }}>Login</button>
      </form>
    </div>
  );
};

export default Login;