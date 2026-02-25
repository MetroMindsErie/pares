import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

const FAQ_ITEMS = [
	{
		q: 'What areas does the MLS search cover?',
		a: 'The MLS feed used by this site contains properties from Erie, Warren, and Crawford counties in Pennsylvania. Searches outside those counties may return no results.',
	},
	{
		q: 'How do I search by address or ZIP code?',
		a: 'You can enter a full or partial address (for example "1214 E 27th St" or "1214 East 27th Street") or a 5-digit ZIP code. The search performs case-insensitive matching and generates common variants for directionals (E / East) and street types (St / Street) to improve matching.',
	},
	{
		q: 'Why doesn’t my address always return the property?',
		a: 'Street formatting in MLS data can vary (abbreviations, punctuation, order). Try common variants (e.g., "E" vs "East", "St" vs "Street") or the ZIP code. The site attempts variant matching, but exact MLS records may still differ.',
	},
	{
		q: 'Can I filter by price, beds, baths, and square footage?',
		a: 'Yes — the search bar supports min/max price, bedrooms, bathrooms, and square footage ranges. For sold properties you can also filter by closing date range (e.g., last 30 days).',
	},
	{
		q: 'How are property images handled?',
		a: 'Images are retrieved from the MLS Media feed and ordered by the provided "Order" value. If no images are available, a fallback image is shown.',
	},
	{
		q: 'What is the BiggerPockets feed on the homepage?',
		a: 'The BiggerPockets section is a curated feed of articles from the BiggerPockets site. Clicking "Read" opens the original article on BiggerPockets in a new tab.',
	},
	{
		q: 'I found a bug / need support — how do I contact you?',
		a: 'Please use the Contact Us link in the footer or email support@parealestatesolutions.com For urgent matters, include screenshots and the steps to reproduce the issue.',
	},
	{
		q: 'Where can I find terms, privacy policy, and other legal info?',
		a: 'Links to Privacy Policy and Terms of Service are available in the site footer.',
	},
];

export default function FAQPage() {
	const [openIndex, setOpenIndex] = useState(null);

	const toggle = (idx) => {
		setOpenIndex(openIndex === idx ? null : idx);
	};

	return (
		<Layout>
			<Head>
				<title>FAQ — PARES (FAQ & Support)</title>
				<meta
					name="description"
					content="Frequently asked questions about searching the MLS, BiggerPockets feed, and how the PARES site works."
				/>
			</Head>

			<main className="min-h-screen bg-gradient-to-br from-white to-gray-50 py-12">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<header className="mb-8">
						<h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
							Frequently Asked Questions
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Quick answers about searching MLS data, using the site, and the
							BiggerPockets feed.
						</p>
					</header>

					<section
						aria-labelledby="faq-heading"
						className="space-y-4"
					>
						{FAQ_ITEMS.map((item, idx) => {
							const isOpen = openIndex === idx;
							return (
								<div
									key={idx}
									className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
								>
									<button
										type="button"
										aria-expanded={isOpen}
										aria-controls={`faq-panel-${idx}`}
										onClick={() => toggle(idx)}
										className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
									>
										<div>
											<h3 className="text-base font-semibold text-slate-900">
												{item.q}
											</h3>
											<div className="mt-1 text-sm text-slate-500">
												{isOpen
													? 'Click to collapse'
													: 'Click to expand'}
											</div>
										</div>
										<div className="flex-shrink-0">
											<svg
												className={`w-5 h-5 transform transition-transform duration-200 ${
													isOpen ? 'rotate-180' : 'rotate-0'
												}`}
												viewBox="0 0 20 20"
												fill="none"
												stroke="currentColor"
											>
												<path
													d="M6 8l4 4 4-4"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</div>
									</button>

									<div
										id={`faq-panel-${idx}`}
										role="region"
										aria-labelledby={`faq-${idx}`}
										className={`px-5 pb-4 ${
											isOpen ? 'block' : 'hidden'
										}`}
									>
										<p className="text-sm text-slate-700">
											{item.a}
										</p>
									</div>
								</div>
							);
						})}
					</section>

					<div className="mt-10 text-sm text-slate-600">
						<p>
							Still need help? Visit our{' '}
							<Link
								href="/contact"
								className="text-teal-600 hover:underline"
							>
								Contact
							</Link>{' '}
							page or email support.
						</p>
					</div>
				</div>
			</main>
		</Layout>
	);
}
