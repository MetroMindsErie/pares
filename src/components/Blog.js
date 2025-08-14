import React, { useMemo, useState } from 'react';

const TABS = ['All', 'Videos', 'Stories'];

const seedPosts = [
	{
		kind: 'video',
		id: 'vid-101',
		slug: 'tour-modern-luxury-condo',
		title: 'Tour: Modern Luxury Condo in Downtown',
		excerpt:
			'Walkthrough of a stunning 2BD/2BA luxury condo with skyline views, amenities, and staging tips.',
		cover: {
			url: 'https://images.unsplash.com/photo-1505691723518-36a5ac3b2a59?q=80&w=1600&auto=format&fit=crop',
			alt: 'Modern luxury condo living room with skyline view',
			aspectRatio: '16/9',
		},
		categories: ['Videos', 'Luxury', 'Neighborhoods'],
		tags: ['condo', 'tour', 'staging', 'amenities'],
		author: { name: 'Jordan Easter' },
		datePublished: '2025-07-10T10:00:00.000Z',
		neighborhood: 'Downtown',
		priceRange: '$1.2M - $1.4M',
		durationSec: 540,
		featured: true,
		views: 4120,
		youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	},
	{
		kind: 'article',
		id: 'art-202',
		slug: '2025-market-outlook',
		title: '2025 Market Outlook: Rates, Inventory, and Opportunities',
		excerpt:
			'We break down interest rate trends, inventory shifts, and how buyers and sellers can win this year.',
		cover: {
			url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop',
			alt: 'Graphs showing housing market trends',
			aspectRatio: '16/9',
		},
		categories: ['Stories', 'Market'],
		tags: ['rates', 'inventory', 'strategy'],
		author: { name: 'Jordan Easter' },
		datePublished: '2025-06-20T09:00:00.000Z',
		views: 2312,
		html: `
      <p>The real estate market in 2025 is defined by shifting rate expectations and a gradual return of inventory.</p>
      <h3>Key Takeaways</h3>
      <ul>
        <li>Mortgage rates are stabilizing.</li>
        <li>Inventory is trending upward, slowly.</li>
        <li>Buyers have more leverage in select neighborhoods.</li>
      </ul>
      <p>For sellers, high-quality presentation and thoughtful pricing still win. For buyers, patience and pre-approval are key.</p>
    `,
	},
	{
		kind: 'article',
		id: 'art-203',
		slug: 'neighborhood-guide-river-park',
		title: 'Neighborhood Guide: River Park',
		excerpt:
			'Parks, cafes, and riverfront views—here’s what you need to know about living in River Park.',
		cover: {
			url: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop',
			alt: 'Riverfront neighborhood at sunset',
			aspectRatio: '16/9',
		},
		categories: ['Stories', 'Neighborhoods', 'Tips'],
		tags: ['guide', 'walkability', 'schools'],
		author: { name: 'Jordan Easter' },
		datePublished: '2025-05-28T12:00:00.000Z',
		neighborhood: 'River Park',
		html: `
      <p>River Park blends suburban calm with city convenience. Expect tree-lined streets and weekend farmers markets.</p>
      <p>Schools score well above average and commute options include express bus and bike lanes.</p>
    `,
	},
	{
		kind: 'video',
		id: 'vid-104',
		slug: 'how-to-price-your-home',
		title: 'How to Price Your Home to Sell in 2025',
		excerpt: 'Pricing strategy walkthrough with comps, absorption rate, and presentation tips.',
		cover: {
			url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop',
			alt: 'Suburban home exterior',
			aspectRatio: '16/9',
		},
		categories: ['Videos', 'Tips'],
		tags: ['pricing', 'comps', 'sellers'],
		author: { name: 'Jordan Easter' },
		datePublished: '2025-05-01T10:00:00.000Z',
		durationSec: 420,
		views: 980,
		youtubeUrl: 'https://youtu.be/aqz-KE-bpKQ',
	},
	{
		kind: 'article',
		id: 'art-205',
		slug: 'investing-duplex-vs-condo',
		title: 'Investing 101: Duplex vs. Condo in Erie',
		excerpt: 'Cash flow vs HOA, maintenance, tenant profiles, and exit strategies.',
		cover: {
			url: 'https://images.unsplash.com/photo-1560518883-9e77a9d1d5a0?q=80&w=1600&auto=format&fit=crop',
			alt: 'Duplex exterior',
			aspectRatio: '16/9',
		},
		categories: ['Stories', 'Investing'],
		tags: ['cashflow', 'hoa', 'duplex', 'condo'],
		author: { name: 'Team Pares' },
		datePublished: '2025-04-15T12:00:00.000Z',
		html: `
      <p>Duplexes can outperform condos on cash-on-cash returns, but they demand more hands-on management.</p>
      <p>Condos can shine for low-maintenance portfolios and proximity to amenities.</p>
    `,
	},
];

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

function BlogCard({ post, onClick }) {
	const isVideo = post.kind === 'video';
	return (
		<button
			type="button"
			onClick={onClick}
			className="group w-full overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-lg transition"
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
			<div className="p-4 text-left">
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
	);
}

function PostDetail({ post, onBack, related = [] }) {
	const ytId = post.kind === 'video' ? extractYouTubeId(post.youtubeUrl) : null;

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

			{!!related.length && (
				<section className="mt-8">
					<h3 className="mb-3 text-lg font-semibold text-gray-900">Related</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{related.slice(0, 3).map((rp) => (
							<BlogCard key={rp.id} post={rp} onClick={() => {}} />
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
	heading = 'Erie Real Estate Blog',
	showFilters = true,
}) => {
	const [tab, setTab] = useState('All');
	const [q, setQ] = useState('');
	const [category, setCategory] = useState('All');
	const [page, setPage] = useState(1);
	const [active, setActive] = useState(null);

	const posts = postsProp || seedPosts;

	const allCategories = useMemo(() => {
		const set = new Set(['All']);
		posts.forEach((p) => (p.categories || []).forEach((c) => set.add(c)));
		return Array.from(set);
	}, [posts]);

	const filtered = useMemo(() => {
		let list = posts.slice();

		if (tab === 'Videos') list = list.filter((p) => p.kind === 'video');
		if (tab === 'Stories') list = list.filter((p) => p.kind === 'article');

		if (category !== 'All') {
			list = list.filter((p) => (p.categories || []).includes(category));
		}

		if (q.trim()) {
			const s = q.toLowerCase();
			list = list.filter((p) => {
				const hay = [
					p.title,
					p.excerpt || '',
					p.neighborhood || '',
					p.priceRange || '',
					...(p.tags || []),
				]
					.join(' ')
					.toLowerCase();
				return hay.includes(s);
			});
		}

		list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
		return list;
	}, [posts, tab, q, category]);

	const totalPages = disablePagination
		? 1
		: Math.max(1, Math.ceil(filtered.length / pageSize));
	const pageItems = useMemo(() => {
		if (disablePagination) return filtered;
		const start = (page - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, page, pageSize, disablePagination]);

	React.useEffect(() => setPage(1), [tab, q, category]);

	const current = active ? posts.find((p) => p.id === active) : null;
	const related = useMemo(() => {
		if (!current) return [];
		const set = new Set(current.categories || []);
		return posts.filter(
			(p) => p.id !== current.id && (p.categories || []).some((c) => set.has(c))
		);
	}, [current, posts]);

	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
					<p className="text-sm text-gray-600">
						Videos, market insights, neighborhood guides, and investing tips.
					</p>
				</div>

				{!current && showFilters && (
					<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
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

						<input
							className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
							placeholder="Search neighborhoods, tours, tips..."
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
					</div>
				)}
			</div>

			{!current ? (
				<>
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

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{pageItems.map((p) => (
							<BlogCard
								key={p.id}
								post={p}
								onClick={() => {
									if (enableDetail) setActive(p.id);
								}}
							/>
						))}
					</div>

					{!disablePagination && (
						<div className="mt-6 flex items-center justify-center gap-3">
							<button
								onClick={() => setPage((n) => Math.max(1, n - 1))}
								disabled={page <= 1}
								className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
							>
								Prev
							</button>
							<span className="text-sm text-gray-500">
								Page {page} of {totalPages}
							</span>
							<button
								onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
								disabled={page >= totalPages}
								className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
							>
								Next
							</button>
						</div>
					)}
				</>
			) : (
				<PostDetail
					post={current}
					onBack={() => setActive(null)}
					related={related}
				/>
			)}
		</section>
	);
};

export default Blog;
