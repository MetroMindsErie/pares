import React from 'react';
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center p-6 bg-gray-800 text-white">
      <div className="text-xl font-bold">Realtor Logo</div>
      <ul className="flex space-x-6">
        <li><Link href="/">Home</Link></li>
        <li><Link href="#about">About</Link></li>
        <li><Link href="#listings">Listings</Link></li>
        <li><Link href="#contact">Contact</Link></li>
        <li><Link href="/agents">Agents</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
