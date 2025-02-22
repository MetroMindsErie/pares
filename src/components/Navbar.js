import React from 'react';
import Link from 'next/link';
import {Register} from "../components/Register";  // Import your Register component
import Login from "../components/Login";  // Import your Login component
import { useState } from "react";

export function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // Toggle display of login and register modals
  const toggleLogin = () => setShowLogin(!showLogin);
  const toggleRegister = () => setShowRegister(!showRegister);

  return (
    <nav className="flex justify-between items-center p-6 bg-gray-800 text-white">
      {/* Buttons to show Login and Register Modals */}
      <div className="flex justify-center space-x-4 my-8">
          <button
            onClick={toggleLogin}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full w-36 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 ease-in-out"
          >
            Login
          </button>
          <button
            onClick={toggleRegister}
            className="bg-gradient-to-r from-green-400 to-teal-500 text-white p-3 rounded-full w-36 hover:from-green-500 hover:to-teal-600 transition-all duration-300 ease-in-out"
          >
            Register
          </button>
        </div>
              {/* Login Modal */}
              {showLogin && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-xl w-96">
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

        {/* Register Modal */}
        {showRegister && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-xl w-96">
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
