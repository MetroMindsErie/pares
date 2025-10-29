import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/router';

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Scroll to the main search input (if present) otherwise navigate to properties page
  const handleExplore = () => {
    // Prefer the SearchBar's location input
    const searchInput = document.querySelector('input[name="location"]');
    if (searchInput) {
      // Scroll the input into view and focus it for immediate typing
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        searchInput.focus({ preventScroll: true });
      } catch (e) {
        searchInput.focus();
      }
      return;
    }
    // Fallback: navigate to properties page
    router.push('/properties');
  };

  // Simple mouse parallax tokens for subtle motion
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tx = useTransform(mx, (v) => `${v / 60}px`);
  const ty = useTransform(my, (v) => `${v / 80}px`);

  useEffect(() => setMounted(true), []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mx.set(x);
    my.set(y);
  };
  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  if (!mounted) return null;

  return (
    <section
      aria-label="Page outro — call to action"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden"
      style={{ minHeight: '40vh' }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 opacity-95" />
        <svg className="absolute inset-0 w-full h-full opacity-6" aria-hidden>
          <defs>
            <pattern id="grid-outro" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M36 0H0V36" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-outro)" />
        </svg>

        <motion.div style={{ translateX: tx, translateY: ty }} className="absolute -left-16 -top-16 w-48 h-48 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full opacity-18 filter blur-2xl" aria-hidden />
        <motion.div style={{ translateX: tx }} className="absolute right-8 bottom-8 w-44 h-28 opacity-12" aria-hidden>
          <svg viewBox="0 0 320 160" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#60a5fa" stopOpacity="0.14" />
                <stop offset="1" stopColor="#06b6d4" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <rect width="320" height="160" rx="12" fill="url(#g)"></rect>
          </svg>
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left: compact CTA message */}
            <div>
              <p className="inline-flex items-center gap-3 mb-3 text-sm text-cyan-200 bg-white/4 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Ready when you are
              </p>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
                Find modern homes with confident, tech-driven search
              </h2>

              <p className="text-sm sm:text-base text-white/80 max-w-xl mb-6">
                Explore up-to-date MLS listings, save favorites, and get instant alerts — designed for buyers and investors who expect fast, reliable tools.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExplore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-semibold rounded-md shadow hover:scale-[1.02] transition"
                >
                  Explore Listings
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                <button
                  onClick={() => router.push('/contact')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-white/20 text-white bg-transparent rounded-md hover:bg-white/5 transition"
                >
                  Contact an Agent
                </button>
              </div>
            </div>

            {/* Right: three compact feature cards for reassurance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-white/6 backdrop-blur-sm border border-white/6">
                <h4 className="text-sm font-semibold text-white">Real-time Data</h4>
                <p className="text-xs text-white/70 mt-1">Fresh MLS updates so you don't miss out.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/6 backdrop-blur-sm border border-white/6">
                <h4 className="text-sm font-semibold text-white">Save & Compare</h4>
                <p className="text-xs text-white/70 mt-1">Track favorites and compare side-by-side.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/6 backdrop-blur-sm border border-white/6">
                <h4 className="text-sm font-semibold text-white">Expert Support</h4>
                <p className="text-xs text-white/70 mt-1">Local agents ready to guide you.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative bottom separator so footer sits nicely */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" className="w-full h-12" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30 C240 60 480 0 720 30 C960 60 1200 0 1440 30 L1440 80 L0 80 Z" fill="rgba(255,255,255,0.03)" />
        </svg>
      </div>
    </section>
  );
}

export default Hero;