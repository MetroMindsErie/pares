import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-teal-900 to-black text-white pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-800/30 backdrop-blur-md ring-1 ring-white/10 shadow-2xl overflow-hidden">
          <div className="px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
              {/* Brand / description */}
              <div className="md:col-span-5">
                <Link href="/" className="inline-flex items-center gap-3">
                  <img
                    src="/pares_homes.png"
                    alt="pares.homes"
                    className="h-10 w-auto object-contain brightness-0 invert"
                  />
                </Link>

                <p className="mt-4 text-sm text-slate-300 max-w-md">
                  Modern MLS search and curated market insights for investors and agents across Erie, Warren, and Crawford counties.
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <a href="#" aria-label="Facebook" className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/5 border border-white/6 shadow hover:bg-white/6 hover:scale-105 transition">
                    <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="Twitter" className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/5 border border-white/6 shadow hover:bg-white/6 hover:scale-105 transition">
                    <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0016 3a4.5 4.5 0 00-4.47 4.47c0 .35.04.69.11 1.01A12.94 12.94 0 013 4.1s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5 0-.17 0-.34-.01-.51A7.72 7.72 0 0023 3z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="LinkedIn" className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/5 border border-white/6 shadow hover:bg-white/6 hover:scale-105 transition">
                    <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zm-9 7H7v7h3v-7zm-1.5-3a1.5 1.5 0 1 0 .001-3.001A1.5 1.5 0 0 0 8.5 7zM17 10c-1.11 0-1.82.6-2.15 1.02V10h-3v7h3v-3c0-.8.5-2 1.74-2 1.22 0 1.26 1.09 1.26 2.06V17h3v-3.5C21 11.5 19.5 10 17 10z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Explore / Agent */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Explore</h4>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link href="/agents/john-easter" className="inline-flex items-center px-3 py-2 rounded-full bg-white/5 text-slate-100 hover:bg-gradient-to-r hover:from-teal-500 hover:to-green-500 transition">
                      John D. Easter Jr.
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="inline-flex items-center px-3 py-2 rounded-full bg-white/5 text-slate-100 hover:bg-white/10 transition">
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Resources</h4>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link href="/blog" className="inline-flex items-center px-3 py-2 rounded-full bg-white/5 text-slate-100 hover:bg-white/10 transition">Blog</Link>
                  </li>
                  <li>
                    <Link href="/faq" className="inline-flex items-center px-3 py-2 rounded-full bg-white/5 text-slate-100 hover:bg-white/10 transition">FAQ</Link>
                  </li>
                </ul>
              </div>

              {/* Contact / Newsletter */}
              <div className="md:col-span-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Get in touch</h4>
                <p className="mt-3 text-sm text-slate-300 max-w-sm">
                  Questions about a listing or need help with search? Reach out or subscribe for curated updates.
                </p>

                <form className="mt-4 w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
                  <label htmlFor="footer-email" className="sr-only">Email address</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      id="footer-email"
                      type="email"
                      placeholder="you@company.com"
                      className="w-full rounded-full border border-transparent px-4 py-2 text-sm bg-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      type="submit"
                      className="mt-0 sm:mt-0 flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-105 transition"
                    >
                      Subscribe
                    </button>
                  </div>
                </form>

                <div className="mt-6">
                  <p className="text-xs text-slate-400">
                    Or email <a href="mailto:support@pares.homes" className="text-teal-300 hover:underline">support@pares.homes</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Legal */}
            <div className="mt-8 pt-6 border-t border-white/6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-400">© {currentYear} pares.homes — Real Estate Solutions. All rights reserved.</p>

                <div className="flex items-center gap-4">
                  <Link href="/privacy" className="text-sm text-slate-300 hover:text-white transition">Privacy</Link>
                  <Link href="/terms" className="text-sm text-slate-300 hover:text-white transition">Terms</Link>
                  <Link href="/sitemap.xml" className="text-sm text-slate-300 hover:text-white transition">Sitemap</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;