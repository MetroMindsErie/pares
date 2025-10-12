import React, { useState, useEffect } from 'react';
import { formatPostDate, truncateSnippet, getRelativeTime } from '../utils/dateUtils';

function BiggerPocketsCard({ post }) {
  return (
    <div className="group w-full overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
            <a 
              href={post.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {post.title}
            </a>
          </h3>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              BiggerPockets
            </span>
          </div>
        </div>

        {post.contentSnippet && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-3">
            {truncateSnippet(post.contentSnippet, 140)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
          {post.author && <span>✍️ {post.author}</span>}
          <span>📅 {formatPostDate(post.pubDate)}</span>
          <span className="text-gray-400">•</span>
          <span>{getRelativeTime(post.pubDate)}</span>
        </div>

        <div className="flex items-center justify-between">
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Read on BiggerPockets
            <svg width="12" height="12" viewBox="0 0 24 24" className="fill-current">
              <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="p-4 animate-pulse">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="flex gap-3 mb-3">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Real Estate Insights from BiggerPockets
          </h2>
          <p className="text-sm text-gray-600">
            Latest articles and strategies from the BiggerPockets community
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          Live Feed
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 font-medium mb-1">Unable to load BiggerPockets posts</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-600">
          <p>No BiggerPockets posts available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BiggerPocketsCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
