import React from 'react';
import Link from 'next/link';
import { Register } from "../components/Register";
import Login from "../components/Login";
import { useState } from "react";

export function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const toggleLogin = () => setShowLogin(!showLogin);
  const toggleRegister = () => setShowRegister(!showRegister);

  return (
    <nav className="flex justify-between items-center p-6 bg-white text-black border-b border-black">
      <div className="flex justify-center space-x-4 my-8">
        <button
          onClick={toggleLogin}
          className="bg-gradient-to-r from-gray-200 to-gray-400 text-black p-3 rounded-full w-36 border border-black hover:from-gray-300 hover:to-gray-500 transition-all duration-300 ease-in-out"
        >
          Login
        </button>
        <button
          onClick={toggleRegister}
          className="bg-gradient-to-r from-gray-200 to-gray-400 text-black p-3 rounded-full w-36 border border-black hover:from-gray-300 hover:to-gray-500 transition-all duration-300 ease-in-out"
        >
          Register
        </button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-black">
            <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>
            <Login />
            <button
              onClick={toggleLogin}
              className="mt-4 w-full bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-black">
            <h2 className="text-2xl font-semibold mb-6 text-center">Register</h2>
            <Register />
            <button
              onClick={toggleRegister}
              className="mt-4 w-full bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ul className="flex space-x-6">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/#about">About</Link></li>
        <li><Link href="/#listings">Listings</Link></li>
        <li><Link href="/#contact">Contact</Link></li>
        <li><Link href="/agents">Agents</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;