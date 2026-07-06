import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { fetchTrestleOData } from '../lib/trestleServer';
import { proxiedImageUrl, imageSrcSet } from '../utils/imageProxy';
import { AGENT, SITE_URL, SITE_NAME } from '../config/agent';

const fmtPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

function primaryPhoto(media) {
  if (!Array.isArray(media) || media.length === 0) return null;
  const preferred = media.find((m) => m.PreferredPhotoYN === true || m.PreferredPhotoYN === 'Y');
  return (preferred || media[0])?.MediaURL || null;
}

export default function LakefrontPage({ listings, fetchedAt }) {
  return (
    <Layout>
      <Head>
        <title>{`Lakefront & Waterfront Homes for Sale — Erie PA | ${SITE_NAME}`}</title>
        <meta
          name="description"
          content="Every active lakefront and waterfront listing in the Erie, Warren, and Crawford county MLS — Lake Erie, Presque Isle Bay, Edinboro Lake, and more. Updated daily."
        />
        <link rel="canonical" href={`${SITE_URL}/lakefront`} />
        <meta property="og:title" content="Lakefront & Waterfront Homes for Sale in Erie PA" />
        <meta property="og:description" content="Live MLS feed of every waterfront listing in the Erie region." />
        <meta property="og:url" content={`${SITE_URL}/lakefront`} />
        <meta property="og:site_name" content={SITE_NAME} />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero */}
        <section className="bg-gradient-to-r from-slate-900 to-teal-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <h1 className="text-3xl sm:text-4xl font-extrabold">Lakefront &amp; Waterfront Homes</h1>
            <p className="mt-3 text-teal-100 max-w-2xl">
              Living on the water is the Erie region&rsquo;s signature move — Lake Erie, Presque Isle Bay, and the
              inland lakes of Warren and Crawford counties. These are all the active waterfront listings in the MLS,
              straight from the live feed.
            </p>
            <p className="mt-4 text-sm text-teal-200">
              Want first word when something hits the water?{' '}
              <Link href={AGENT.profileUrl} className="underline hover:text-white">Talk to {AGENT.shortName}</Link> —
              he watches this market daily.
            </p>
          </div>
        </section>

        {/* Listings */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {listings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">No active waterfront listings right now — they move fast.</p>
              <Link href={AGENT.profileUrl} className="mt-3 inline-block text-teal-600 hover:underline">
                Ask {AGENT.shortName} about off-market waterfront opportunities →
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                {listings.length} active waterfront {listings.length === 1 ? 'listing' : 'listings'} · updated {fetchedAt}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((l) => (
                  <Link
                    key={l.ListingKey}
                    href={`/property/${l.ListingKey}`}
                    className="group block rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative h-56 bg-gray-200 overflow-hidden">
                      {l.photo ? (
                        <img
                          src={proxiedImageUrl(l.photo, 640)}
                          srcSet={imageSrcSet(l.photo)}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          alt={l.UnparsedAddress || 'Waterfront property'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.target.src = '/fallback-property.jpg'; }}
                        />
                      ) : (
                        <img src="/fallback-property.jpg" alt="" className="w-full h-full object-cover" />
                      )}
                      {l.WaterBodyName && (
                        <span className="absolute top-3 left-3 bg-sky-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                          {l.WaterBodyName}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xl font-bold text-gray-900">{fmtPrice(l.ListPrice)}</p>
                      <p className="mt-1 text-sm text-gray-700 truncate">{l.UnparsedAddress}</p>
                      <p className="text-sm text-gray-500">
                        {l.PostalCity}, PA {l.PostalCode}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {l.BedroomsTotal ? `${l.BedroomsTotal} bd` : ''}{l.BedroomsTotal && l.BathroomsTotalInteger ? ' · ' : ''}
                        {l.BathroomsTotalInteger ? `${l.BathroomsTotalInteger} ba` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

export async function getServerSideProps() {
  let listings = [];
  try {
    const { json } = await fetchTrestleOData('odata/Property', {
      $filter: "StandardStatus eq 'Active' and WaterfrontYN eq true",
      $select: 'ListingKey,UnparsedAddress,PostalCity,PostalCode,ListPrice,BedroomsTotal,BathroomsTotalInteger,WaterBodyName',
      $expand: 'Media($select=MediaURL,Order,PreferredPhotoYN;$orderby=Order asc;$top=1)',
      $orderby: 'ListPrice desc',
      $top: 100,
    });
    const seen = new Set();
    listings = (json?.value || [])
      .filter((p) => {
        // The feed sometimes duplicates a listing under multiple keys — dedupe by address+price.
        const sig = `${p.UnparsedAddress}|${p.ListPrice}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return Boolean(p.ListingKey);
      })
      .map((p) => ({
        ListingKey: p.ListingKey,
        UnparsedAddress: p.UnparsedAddress || '',
        PostalCity: p.PostalCity || '',
        PostalCode: p.PostalCode || '',
        ListPrice: p.ListPrice || 0,
        BedroomsTotal: p.BedroomsTotal || 0,
        BathroomsTotalInteger: p.BathroomsTotalInteger || 0,
        WaterBodyName: p.WaterBodyName || null,
        photo: primaryPhoto(p.Media),
      }));
  } catch (e) {
    console.error('lakefront: MLS fetch failed', e?.message || e);
  }

  return {
    props: {
      listings,
      fetchedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
  };
}

export const runtime = 'experimental-edge';
