import React, { useState } from "react";

export function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    // Handle registration logic (API call to your backend)
    try {
      const response = await fetch("http://localhost:5000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data = await response.json();
      // Handle successful registration (redirect to login, etc.)
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {error && <div className="text-red-500 text-center">{error}</div>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="p-4 border-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-4 border-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
      />
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white p-3 rounded-full hover:from-green-500 hover:to-teal-600 transition-all duration-300"
      >
        Register
      </button>
    </form>
  );
}

export default Register;