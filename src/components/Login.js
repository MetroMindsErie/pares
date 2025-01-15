import React, { useState } from 'react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Include cookies in the request
      });
  
      if (!response.ok) {
        throw new Error('Login failed');
      }
  
      console.log('User logged in');
      // Redirect to the home page or dashboard
    } catch (error) {
      setError(error.message);
    }
  };

  const token = localStorage.getItem('authToken');

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies in the request
      });
      // Redirect to the login page or homepage
      window.location.href = '/login'; // Adjust the path as needed
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  
  

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {error && <div className="text-red-500 text-center">{error}</div>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="p-4 border-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-4 border-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
      >
        Login
      </button>
    </form>
  );
};

export default Login;
