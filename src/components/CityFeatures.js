"use client";
import { motion } from 'framer-motion';

const CityFeatures = () => {
  const features = [
    {
      id: 'lakefront',
      title: 'Lakefront Living',
      desc: 'Stunning Lake Erie views and recreational access — waterfront homes, parks and trails.',
      color: 'from-cyan-400 to-blue-600',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12c2-4 6-7 9-7s7 3 9 7-2 7-9 7S3 16 3 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'downtown',
      title: 'Revitalized Downtown',
      desc: 'Mix of restored historic architecture and modern coworking, dining and retail.',
      color: 'from-emerald-300 to-green-500',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 21h18M7 8v13M17 4v17M12 2v19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'affordable',
      title: 'Affordable Market',
      desc: 'High value and strong investment potential compared to larger metros.',
      color: 'from-purple-300 to-indigo-500',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'community',
      title: 'Tight-knit Community',
      desc: 'Local events, festivals, and neighborhoods that welcome families and investors.',
      color: 'from-yellow-300 to-orange-400',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 11c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'transport',
      title: 'Accessible Transport',
      desc: 'Quick regional connections, easy commutes and growing infrastructure projects.',
      color: 'from-sky-300 to-cyan-500',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12h18M7 6v12M17 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'growth',
      title: 'Growth Opportunities',
      desc: 'New developments, incentives and redevelopment projects boosting local ROI.',
      color: 'from-pink-300 to-rose-400',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 17l6-6 5 5 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="city-features-section relative overflow-hidden py-16 lg:py-24"
      aria-label="City features and highlights"
    >
      {/* decorative gradient shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute -right-20 -top-12 opacity-20 w-80 h-80" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <linearGradient id="gA" x1="0" x2="1">
              <stop offset="0" stopColor="#60A5FA" stopOpacity="0.18" />
              <stop offset="1" stopColor="#06B6D4" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="32" fill="url(#gA)"></rect>
        </svg>
        <svg className="absolute -left-20 -bottom-12 opacity-16 w-72 h-72" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <linearGradient id="gB" x1="0" x2="1">
              <stop offset="0" stopColor="#C084FC" stopOpacity="0.12" />
              <stop offset="1" stopColor="#F472B6" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#gB)"></circle>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left intro + CTA */}
          <div className="pr-4 lg:pr-8">
            <div className="inline-flex items-center gap-3 mb-4">
              {/* <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-200 to-blue-200 text-sm font-semibold text-slate-800">
                ERIE HIGHLIGHTS
              </span> */}
              <span className="text-sm text-slate-400">Curated for modern buyers & investors</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
              Why Erie stands out — an investor & lifestyle-first city
            </h2>

            <p className="text-lg text-slate-600 mb-6 max-w-xl">
              From waterfront living to a revitalized downtown and strong affordability, Erie blends opportunity with quality of life. Explore curated neighborhoods, market insights and properties built for long-term value.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition"
                aria-label="Explore neighborhoods"
              >
                Explore Neighborhoods
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>

              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white text-sm font-medium hover:bg-slate-50 transition"
                aria-label="View market report"
              >
                Market Report
              </button>
            </div>
          </div>

          {/* Right: grid of feature cards */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f, idx) => (
                <article
                  key={f.id}
                  className={`feature-card group relative overflow-hidden rounded-2xl p-5 sm:p-6 transition hover:shadow-2xl`}
                  aria-labelledby={`feat-${f.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`feature-badge bg-gradient-to-br ${f.color} text-white rounded-lg w-12 h-12 flex items-center justify-center flex-shrink-0 shadow-md`}>
                      {f.icon}
                    </div>
                    <div>
                      <h3 id={`feat-${f.id}`} className="text-sm font-semibold text-slate-900 mb-1">{f.title}</h3>
                      <p className="text-sm text-slate-600">{f.desc}</p>
                    </div>
                  </div>

                  <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default CityFeatures;
