import React, { useMemo, useState, useEffect } from 'react';
import { fetchPosts, fetchPost, fetchRelatedPosts, engageWithPost, fetchCategories } from '../api/blogApi';
import BiggerPocketsSection from './BiggerPocketsSection';
import { useAnalytics } from '../hooks/useAnalytics';

const TABS = ['All', 'Videos', 'Stories'];

function extractYouTubeId(url) {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
		if (u.hostname.includes('youtube.com')) {
			if (u.searchParams.get('v')) return u.searchParams.get('v');
			const parts = u.pathname.split('/').filter(Boolean);
			const embedIdx = parts.indexOf('embed');
			if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
			const shortsIdx = parts.indexOf('shorts');
			if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
		}
	} catch (e) {
		// ignore
	}
	const m = String(url).match(
		/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{6,})/
	);
	return m ? m[1] : null;
}

function EngagementButtons({ post, onEngage }) {
	const { trackBlogEngagement } = useAnalytics();
	const [engagement, setEngagement] = useState({
		likes: post.likes || 0,
		loves: post.loves || 0,
		shares: post.shares || 0,
	});

	const [userEngagement, setUserEngagement] = useState({
		like: false,
		love: false,
		share: false,
	});

	// Handle engagement action
	const handleEngagement = async (type) => {
		try {
			// Only allow one like/love per session
			if ((type === 'like' || type === 'love') && userEngagement[type]) {
				return;
			}

			const response = await engageWithPost(post.id, type);
			
			// Track the engagement
			trackBlogEngagement(post, type);

			// Update counts
			setEngagement({
				likes: response.likes,
				loves: response.loves,
				shares: response.shares,
			});

			// Update user engagement state
			setUserEngagement((prev) => ({
				...prev,
				[type]: true,
			}));

			if (onEngage) {
				onEngage(type, response);
			}
		} catch (error) {
			console.error(`Error with ${type}:`, error);
		}
	};

	return (
		<div className="mt-4 flex items-center gap-3">
			<button
				onClick={() => handleEngagement('like')}
				className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
					userEngagement.like
						? 'bg-blue-100 text-blue-700'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
				}`}
			>
				<span>👍</span> {engagement.likes}
			</button>

			<button
				onClick={() => handleEngagement('love')}
				className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
					userEngagement.love
						? 'bg-red-100 text-red-700'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
				}`}
			>
				<span>❤️</span> {engagement.loves}
			</button>

			<button className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200">
				<span>🔗</span> {engagement.shares}
			</button>
		</div>
	);
}

function BlogCard({ post, onClick }) {
	const { trackBlogPostView } = useAnalytics();
	const isVideo = post.kind === 'video';
	
	const handleClick = () => {
		trackBlogPostView(post);
		if (onClick) onClick();
	};

	return (
		<div className="group w-full overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-lg transition">
			<button
				type="button"
				onClick={handleClick}
				className="w-full text-left"
				aria-label={`Open ${post.title}`}
			>
				<div className="relative aspect-video overflow-hidden bg-gray-100">
					{post.cover?.url && (
						<img
							src={post.cover.url}
							alt={post.cover.alt || post.title}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					)}
					<div className="absolute left-3 top-3">
						<span className="inline-flex items-center rounded-full border border-white/30 bg-black/50 px-2 py-1 text-xs text-white backdrop-blur">
							{post.categories?.[0] || (isVideo ? 'Videos' : 'Stories')}
						</span>
					</div>
					{isVideo && (
						<div className="absolute inset-0 grid place-items-center">
							<div className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-black/40">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									className="fill-white translate-x-0.5"
								>
									<path d="M8 5v14l11-7z"></path>
								</svg>
							</div>
						</div>
					)}
				</div>
				<div className="p-4">
					<h3 className="text-base font-semibold text-gray-900 line-clamp-2">
						{post.title}
					</h3>
					{post.excerpt && (
						<p className="mt-2 text-sm text-gray-600 line-clamp-3">
							{post.excerpt}
						</p>
					)}
					<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
						{post.neighborhood && <span>🏙️ {post.neighborhood}</span>}
						{post.priceRange && <span>💲 {post.priceRange}</span>}
						<span>
							📅{' '}
							{new Date(post.datePublished).toLocaleDateString(undefined, {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</span>
						{isVideo && post.durationSec ? (
							<span>⏱ {Math.round(post.durationSec / 60)}m</span>
						) : null}
						{typeof post.views === 'number' && (
							<span>👁 {post.views.toLocaleString()}</span>
						)}
					</div>
					{!!(post.tags || []).length && (
						<div className="mt-3 flex flex-wrap gap-2">
							{post.tags.slice(0, 3).map((t) => (
								<span
									key={t}
									className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
								>
									#{t}
								</span>
							))}
						</div>
					)}
				</div>
			</button>
			<div className="px-4 pb-4">
				<EngagementButtons
					post={post}
					onEngage={async (type, response) => {
						// This is handled by the EngagementButtons component internally
					}}
				/>
			</div>
		</div>
	);
}

function PostDetail({ post, onBack, related = [] }) {
	const ytId = post.kind === 'video' ? extractYouTubeId(post.youtubeUrl) : null;

	// Track view when the detail page is loaded
	useEffect(() => {
		async function trackView() {
			try {
				await engageWithPost(post.id, 'view');
			} catch (error) {
				console.error('Failed to track view:', error);
			}
		}

		trackView();
	}, [post.id]);

	return (
		<article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
			<button
				onClick={onBack}
				className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
			>
				← Back to all posts
			</button>

			<header className="mb-4">
				<h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
				<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
					{post.author?.name && <span>✍️ {post.author.name}</span>}
					<span>
						📅{' '}
						{new Date(post.datePublished).toLocaleDateString(undefined, {
							month: 'short',
							day: 'numeric',
							year: 'numeric',
						})}
					</span>
					{post.neighborhood && <span>🏙️ {post.neighborhood}</span>}
					{post.priceRange && <span>💲 {post.priceRange}</span>}
					{post.kind === 'video' && post.durationSec ? (
						<span>⏱ {Math.round(post.durationSec / 60)}m</span>
					) : null}
					<span>👁 {(post.views || 0).toLocaleString()} views</span>
				</div>
			</header>

			<div className="overflow-hidden rounded-xl border border-gray-200">
				{post.kind === 'video' && ytId ? (
					<div className="relative aspect-video">
						<iframe
							src={`https://www.youtube.com/embed/${ytId}`}
							title={post.title}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen
							className="absolute inset-0 h-full w-full"
						/>
					</div>
				) : post.cover?.url ? (
					<img
						src={post.cover.url}
						alt={post.cover.alt || post.title}
						className="h-auto w-full"
					/>
				) : null}
			</div>

			{post.excerpt && <p className="mt-4 text-gray-600">{post.excerpt}</p>}

			{post.kind === 'article' && (
				<div
					className="prose prose-gray mt-4 max-w-none prose-headings:scroll-mt-20"
					dangerouslySetInnerHTML={{ __html: post.html }}
				/>
			)}

			<EngagementButtons
				post={post}
				onEngage={(type, data) => {
					// We can add additional handling here if needed
				}}
			/>

			{!!related.length && (
				<section className="mt-8">
					<h3 className="mb-3 text-lg font-semibold text-gray-900">Related</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{related.map((rp) => (
							<BlogCard key={rp.id} post={rp} onClick={() => onBack()} />
						))}
					</div>
				</section>
			)}
		</article>
	);
}

const Blog = ({
	posts: postsProp,
	pageSize = 6,
	enableDetail = true,
	disablePagination = false,
	heading = 'PARES Blog',
	showFilters = true,
	showBiggerPockets = true,
	showSeeAllButton = true,
	onSeeAllClick, // Callback for "See all" button click
	blogListingPath = '/blog', // Default path for blog listing page
}) => {
	const { trackPropertySearch } = useAnalytics();
	const [tab, setTab] = useState('All');
	const [q, setQ] = useState('');
	const [category, setCategory] = useState('All');
	const [page, setPage] = useState(1);
	const [active, setActive] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// States for database-loaded content
	const [posts, setPosts] = useState([]);
	const [totalPages, setTotalPages] = useState(1);
	const [currentPost, setCurrentPost] = useState(null);
	const [relatedPosts, setRelatedPosts] = useState([]);
	const [allCategories, setAllCategories] = useState(['All']);

	// Handle "See All Posts" click
	const handleSeeAllClick = () => {
		if (onSeeAllClick) {
			onSeeAllClick();
		} else {
			// Default navigation if no custom handler provided
			window.location.href = blogListingPath;
		}
	};

	// Fetch posts based on current filters
	useEffect(() => {
		async function loadPosts() {
			if (postsProp) {
				// Use provided posts if available (for testing/SSR)
				setPosts(postsProp);
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const data = await fetchPosts({
					tab,
					category,
					query: q,
					page,
					pageSize,
				});

				setPosts(data.posts);
				setTotalPages(data.pagination.totalPages);
				setLoading(false);
			} catch (err) {
				console.error('Failed to load posts:', err);
				setError('Failed to load blog posts. Please try again.');
				setLoading(false);
			}
		}

		loadPosts();
	}, [tab, category, q, page, pageSize, postsProp]);

	// Fetch all categories for filter
	useEffect(() => {
		async function loadCategories() {
			try {
				const { categories } = await fetchCategories();
				setAllCategories(['All', ...categories]);
			} catch (err) {
				console.error('Failed to load categories:', err);
			}
		}

		if (!postsProp && showFilters) {
			loadCategories();
		}
	}, [postsProp, showFilters]);

	// Fetch post details when active changes
	useEffect(() => {
		async function loadPostDetails() {
			if (!active) {
				setCurrentPost(null);
				setRelatedPosts([]);
				return;
			}

			setLoading(true);
			try {
				const [postData, relatedData] = await Promise.all([
					fetchPost(active),
					fetchRelatedPosts(active),
				]);

				setCurrentPost(postData);
				setRelatedPosts(relatedData.posts);
				setLoading(false);
			} catch (err) {
				console.error('Failed to load post details:', err);
				setError('Failed to load post details. Please try again.');
				setLoading(false);
			}
		}

		if (enableDetail) {
			loadPostDetails();
		}
	}, [active, enableDetail]);

	// Reset page when filters change
	React.useEffect(() => setPage(1), [tab, q, category]);

	// Track search when query changes
	useEffect(() => {
		if (q) {
			trackPropertySearch({
				query: q,
				category: category !== 'All' ? category : '',
				tab: tab !== 'All' ? tab : '',
				resultsCount: posts.length,
			});
		}
	}, [q, category, tab, posts.length, trackPropertySearch]);

	return (
		<div className="space-y-8">
			{/* Original PARES Blog Section */}
			<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="mb-6">
					{/* Header section with improved layout */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
							<p className="text-sm text-gray-600 mt-1">
								Videos, market insights, neighborhood guides, and investing tips.
							</p>
						</div>
						
						{/* See All Button - Updated to match BiggerPockets styling */}
						{!currentPost && showSeeAllButton && (
							<button
								onClick={handleSeeAllClick}
								className="mt-3 sm:mt-0 inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
								aria-label="View all blog posts"
							>
								See all posts
								<svg width="12" height="12" viewBox="0 0 24 24" className="fill-current">
									<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59z"/>
								</svg>
							</button>
						)}
					</div>

					{/* Filters section */}
					{!currentPost && showFilters && (
						<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
							<div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
								{TABS.map((t) => (
									<button
										key={t}
										onClick={() => setTab(t)}
										className={`rounded-lg px-3 py-1.5 text-sm ${
											tab === t
												? 'bg-white text-gray-900 shadow-sm'
												: 'text-gray-600 hover:text-gray-900'
										}`}
										aria-pressed={tab === t}
									>
										{t}
									</button>
								))}
							</div>

							{/* <input
								className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
								placeholder="Search neighborhoods, tours, tips..."
								value={q}
								onChange={(e) => setQ(e.target.value)}
								aria-label="Search blog posts"
							/> */}
						</div>
					)}
				</div>

				{/* Loading, error, and content states */}
				{loading ? (
					<div className="my-12 flex justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-label="Loading"></div>
					</div>
				) : error ? (
					<div className="my-8 rounded-lg bg-red-50 p-4 text-center text-red-700" role="alert">
						{error}
						<button
							onClick={() => window.location.reload()}
							className="ml-2 text-blue-700 underline"
						>
							Reload
						</button>
					</div>
				) : !currentPost ? (
					<>
						{/* Category filters */}
						<div className="mb-4 flex flex-wrap items-center gap-2">
							{showFilters &&
								allCategories.map((c) => (
									<button
										key={c}
										onClick={() => setCategory(c)}
										className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
											category === c
												? 'border-blue-300 bg-blue-50 text-blue-700'
												: 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
										}`}
										aria-pressed={category === c}
									>
										{c}
									</button>
								))}
						</div>

						{/* Post grid or empty state */}
						{posts.length === 0 ? (
							<div className="my-12 text-center text-gray-500">
								No posts found matching your criteria.
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{posts.map((p) => (
									<BlogCard
										key={p.id}
										post={p}
										onClick={() => {
											if (enableDetail) setActive(p.id);
										}}
									/>
								))}
							</div>
						)}

						{/* Pagination */}
						{!disablePagination && totalPages > 1 && (
							<div className="mt-6 flex items-center justify-center gap-3">
								<button
									onClick={() => setPage((n) => Math.max(1, n - 1))}
									disabled={page <= 1}
									className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
									aria-label="Previous page"
								>
									Prev
								</button>
								<span className="text-sm text-gray-500">
									Page {page} of {totalPages}
								</span>
								<button
									onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
									disabled={page >= totalPages}
									className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
									aria-label="Next page"
								>
									Next
								</button>
							</div>
						)}
					</>
				) : (
					<PostDetail
						post={currentPost}
						onBack={() => setActive(null)}
						related={relatedPosts}
					/>
				)}
			</section>

			{/* BiggerPockets Section - Only show when not viewing post details */}
			{showBiggerPockets && !currentPost && (
				<BiggerPocketsSection />
			)}
		</div>
	);
};

export default Blog;
