import React, { useState, useEffect } from 'react';
import { formatPostDate, truncateSnippet, getRelativeTime } from '../utils/dateUtils';

/* Featured hero card for the top post */
function FeaturedCard({ post }) {
  // open link in new tab
  const openLink = () => window.open(post.link, '_blank', 'noopener,noreferrer');
  const handleClick = (e) => {
    // if user clicked an inner anchor or button, don't duplicate navigation
    if (e.target.closest('a') || e.target.closest('button')) return;
    openLink();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLink();
    }
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      // allow the card to span the full column width (no max width, no centering)
      className="group relative rounded-2xl overflow-hidden shadow-2xl hover:scale-[1.01] transition-transform duration-300 bg-transparent min-w-0 w-full cursor-pointer"
    >
      {/* increase xs height so title has room; keep smaller heights at larger breakpoints */}
      <div className="relative h-56 sm:h-64 md:h-72 lg:h-96">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-green-600" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        {/* more top padding on xs (reduced) and slightly larger on sm; progressive reduction for md/lg */}
        <div className="absolute left-3 sm:left-5 lg:left-6 bottom-3 sm:bottom-6 right-3 sm:right-5 lg:right-6 pt-2 sm:pt-3 md:pt-2 lg:pt-1">
          <h3 className="text-white text-xl sm:text-2xl lg:text-3xl font-extrabold leading-normal line-clamp-2">
            <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {post.title}
            </a>
          </h3>

          {post.contentSnippet && (
            <p className="mt-3 text-sm text-white/90 max-w-2xl line-clamp-3">
              {truncateSnippet(post.contentSnippet, 220)}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="text-xs text-white/80 flex items-center gap-3">
              {post.author && <span className="font-medium">✍️ {post.author}</span>}
              <span>📅 {formatPostDate(post.pubDate)}</span>
              <span className="text-white/40">•</span>
              <span>{getRelativeTime(post.pubDate)}</span>
            </div>

            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1.5 sm:px-4 sm:py-2 sm:text-sm font-semibold text-white shadow hover:opacity-95 max-w-[48%] sm:max-w-none truncate"
              aria-label="Read on BiggerPockets"
            >
              {/* short label for very small screens, full label on sm+ */}
              <span className="inline sm:hidden">Read</span>
              <span className="hidden sm:inline truncate">Read on BiggerPockets</span>
              <svg viewBox="0 0 24 24" className="fill-white w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ml-1" aria-hidden="true">
                <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/* Standard card for subsequent posts */
function ImageCard({ post }) {
  const openLink = () => window.open(post.link, '_blank', 'noopener,noreferrer');
  const handleClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    openLink();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLink();
    }
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      // remove semi-opaque white so image colors show through
      className="group relative rounded-2xl overflow-hidden shadow hover:shadow-lg transition-shadow duration-200 bg-transparent min-w-0 max-w-full cursor-pointer"
    >
      {/* slightly smaller on very small screens to avoid vertical overflow */}
      <div className="relative h-40 sm:h-44">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-300 to-green-400" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* use slightly smaller insets on xs so text and badges don't clip */}
        <div className="absolute left-3 bottom-3 right-3">
          <h4 className="text-white font-semibold text-base line-clamp-2">
            <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {post.title}
            </a>
          </h4>
          <p className="mt-2 text-xs text-white/90 line-clamp-2">{truncateSnippet(post.contentSnippet || '', 120)}</p>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-white/80 flex items-center gap-2">
              {post.author && <span>✍️ {post.author}</span>}
              <span>📅 {formatPostDate(post.pubDate)}</span>
            </div>
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              Read
            </a>
          </div>
        </div>
      </div>

      {/* footer should not block the card color/image */}
      <div className="p-4 bg-transparent">
        <div className="text-sm text-slate-700">{getRelativeTime(post.pubDate)}</div>
      </div>
    </article>
  );
}

function LoadingCard({ featured = false }) {
  return (
    <div className={`animate-pulse rounded-2xl ${featured ? 'h-72' : 'h-48'} bg-gradient-to-br from-white/70 to-white/60 p-4`} aria-hidden>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="mt-4 h-8 bg-gray-200 rounded w-28"></div>
    </div>
  );
}

export default function BiggerPocketsSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBiggerPocketsPosts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/biggerpockets');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch BiggerPockets posts');
        }

        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error fetching BiggerPockets posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBiggerPocketsPosts();
  }, []);

  return (
    <section
      className="relative rounded-3xl p-4 sm:p-6 lg:p-8 overflow-hidden bg-transparent"
      style={{ background: 'transparent' }}
      aria-labelledby="biggerpockets-heading"
    >
      {/* Decorative SVG pattern */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <svg className="absolute right-0 top-0 opacity-8 w-64 h-64 transform translate-x-16 -translate-y-16" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="bpGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="45" fill="url(#bpGrad)" />
        </svg>
      </div>

      {/* keep page padding within the content wrapper to avoid edge overflow on mobile */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 id="biggerpockets-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Real Estate Insights — BiggerPockets
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Curated articles and investor strategies from the BiggerPockets community — handpicked for local investors and agents.
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-3 z-20">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 sm:px-4 py-1 sm:py-1 text-xs sm:text-sm font-semibold text-emerald-700 shadow-sm whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live Feed
            </div>

            <a
              href="https://www.biggerpockets.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 whitespace-nowrap"
            >
              Visit BiggerPockets
            </a>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="pt-4 md:pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingCard featured />
            {[...Array(5)].map((_, i) => <LoadingCard key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 text-center">
            <p className="text-red-700 font-semibold">Unable to load BiggerPockets posts</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200">
                Try Again
              </button>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">
            <p>No BiggerPockets posts available at the moment.</p>
          </div>
        ) : (
          // center grid items vertically on large screens so featured card sits centered
          <div className="pt-4 md:pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start lg:items-center">
            {posts.slice(0, 1).map((post) => (
              // span all 3 columns and let the card fill the space
              <div key={post.id} className="lg:col-span-3 max-w-full min-w-0 w-full">
                <FeaturedCard post={post} />
              </div>
            ))}

            {posts.slice(1, 7).map((post) => (
              <div key={post.id} className="max-w-full min-w-0">
                <ImageCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
