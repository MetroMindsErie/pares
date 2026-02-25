import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/auth-context';
import { ROLES, SUBSCRIPTION_TIERS, PROFESSIONAL_TYPES } from '../lib/authorizationUtils';

/* ------------------------------------------------------------------ */
/*  Tier & feature data                                               */
/* ------------------------------------------------------------------ */

const BILLING_CYCLES = { MONTHLY: 'monthly', YEARLY: 'yearly' };

const PLANS = [
  {
    id: SUBSCRIPTION_TIERS.FREE,
    name: 'Free',
    tagline: 'Get started and explore listings',
    monthly: 0,
    yearly: 0,
    highlighted: false,
    cta: 'Current Plan',
    features: [
      { text: 'Browse all property listings', included: true },
      { text: 'Save up to 10 properties', included: true },
      { text: 'View public agent profiles', included: true },
      { text: 'Basic property search', included: true },
      { text: 'Contact professionals', included: true },
      { text: 'List properties', included: false },
      { text: 'Analytics dashboard', included: false },
      { text: 'Professional profile', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    id: SUBSCRIPTION_TIERS.PROFESSIONAL,
    name: 'Professional',
    tagline: 'For agents, brokers & active investors',
    monthly: 29,
    yearly: 290,
    highlighted: true,
    badge: 'Most Popular',
    cta: 'Upgrade to Professional',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'List up to 5 properties', included: true },
      { text: 'Analytics dashboard', included: true },
      { text: 'Professional profile page', included: true },
      { text: '1 featured listing', included: true },
      { text: 'Export contacts', included: true },
      { text: 'Broker: manage up to 5 agents', included: true },
      { text: 'Investor: portfolio management', included: true },
      { text: 'API access', included: false },
      { text: 'White-label & custom domain', included: false },
    ],
  },
  {
    id: SUBSCRIPTION_TIERS.PREMIUM,
    name: 'Premium',
    tagline: 'Unlimited power for top producers',
    monthly: 99,
    yearly: 990,
    highlighted: false,
    cta: 'Upgrade to Premium',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Unlimited property listings', included: true },
      { text: 'Unlimited featured listings', included: true },
      { text: 'Advanced analytics & reporting', included: true },
      { text: 'CRM access & email campaigns', included: true },
      { text: 'Broker: unlimited agents', included: true },
      { text: 'Investor: advanced portfolio tools', included: true },
      { text: 'API access', included: true },
      { text: 'White-label & custom domain', included: true },
    ],
  },
];

/* Per–professional-type feature highlights */
const PROFESSIONAL_HIGHLIGHTS = {
  [PROFESSIONAL_TYPES.AGENT]: {
    title: 'For Real Estate Agents',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
    perks: [
      'List & manage properties',
      'Featured listing placement',
      'Client analytics dashboard',
      'CRM & email campaigns (Premium)',
    ],
  },
  [PROFESSIONAL_TYPES.BROKER]: {
    title: 'For Brokers',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    perks: [
      'Manage your agent team',
      'Company branding',
      'Export contacts & reports',
      'White-label & custom domain (Premium)',
    ],
  },
  [PROFESSIONAL_TYPES.INVESTOR]: {
    title: 'For Investors',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    ),
    perks: [
      'Portfolio management',
      'Fractional investing tools',
      'Performance reports (Premium)',
      'API access for automation (Premium)',
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */

const PRICING_FAQ = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes — upgrade or downgrade whenever you like. When you upgrade you get immediate access to your new features. When you downgrade your current tier stays active until the end of the billing cycle.',
  },
  {
    q: 'Is there a free trial for Professional or Premium?',
    a: 'We offer a 14-day free trial on the Professional plan so you can explore all the features risk-free. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards through Stripe. Invoice billing is available for Premium annual plans.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'Your data is never deleted. If you downgrade, listings above your new plan limit will be unpublished (not removed) and you can re-publish them if you upgrade again.',
  },
  {
    q: 'Do I need a professional plan to browse listings?',
    a: 'No! All users can browse every listing, save properties, and contact agents on the Free plan. Professional plans unlock listing, analytics, and team management features.',
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function CheckIcon({ className = 'h-5 w-5 text-green-500' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className = 'h-5 w-5 text-gray-300' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BillingToggle({ cycle, onChange }) {
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <span
        className={`text-sm font-medium ${
          cycle === BILLING_CYCLES.MONTHLY ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        Monthly
      </span>
      <button
        onClick={() =>
          onChange(
            cycle === BILLING_CYCLES.MONTHLY
              ? BILLING_CYCLES.YEARLY
              : BILLING_CYCLES.MONTHLY
          )
        }
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          cycle === BILLING_CYCLES.YEARLY ? 'bg-teal-600' : 'bg-gray-300'
        }`}
        aria-label="Toggle billing cycle"
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            cycle === BILLING_CYCLES.YEARLY ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${
          cycle === BILLING_CYCLES.YEARLY ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        Yearly
      </span>
      {cycle === BILLING_CYCLES.YEARLY && (
        <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Save 17%
        </span>
      )}
    </div>
  );
}

function PlanCard({ plan, cycle, currentTier, onSelect }) {
  const price = cycle === BILLING_CYCLES.YEARLY ? plan.yearly : plan.monthly;
  const period = plan.id === SUBSCRIPTION_TIERS.FREE ? '' : cycle === BILLING_CYCLES.YEARLY ? '/year' : '/month';
  const isCurrent = currentTier === plan.id;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 transition-shadow hover:shadow-xl ${
        plan.highlighted
          ? 'border-teal-400 bg-white shadow-lg ring-2 ring-teal-400/30'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
            {plan.badge}
          </span>
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-gray-900">
          ${price}
        </span>
        {period && <span className="text-base text-gray-500">{period}</span>}
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent}
        className={`mt-8 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isCurrent
            ? 'cursor-default border border-gray-300 bg-gray-50 text-gray-400'
            : plan.highlighted
            ? 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500'
            : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:ring-gray-500'
        }`}
      >
        {isCurrent ? 'Current Plan' : plan.cta}
      </button>

      {/* Feature list */}
      <ul className="mt-8 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-3 text-sm">
            {f.included ? <CheckIcon /> : <XIcon />}
            <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfessionalTypeCards() {
  return (
    <section className="mt-24">
      <h2 className="text-center text-3xl font-bold text-gray-900">
        Tailored for Every Professional
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
        Each professional type unlocks features designed specifically for your workflow.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {Object.values(PROFESSIONAL_HIGHLIGHTS).map((type) => (
          <div
            key={type.title}
            className="rounded-xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <svg
                  className="h-6 w-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {type.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type.title}
              </h3>
            </div>
            <ul className="space-y-3">
              {type.perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <CheckIcon className="h-4 w-4 mt-0.5 text-teal-500 shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparisonTable({ cycle }) {
  const rows = [
    { feature: 'Property Listings', free: 'Browse only', pro: 'Up to 5', premium: 'Unlimited' },
    { feature: 'Featured Listings', free: '—', pro: '1', premium: 'Unlimited' },
    { feature: 'Analytics Dashboard', free: false, pro: true, premium: true },
    { feature: 'Advanced Analytics', free: false, pro: false, premium: true },
    { feature: 'Professional Profile', free: false, pro: true, premium: true },
    { feature: 'Export Contacts', free: false, pro: true, premium: true },
    { feature: 'Agent Management (Broker)', free: false, pro: 'Up to 5', premium: 'Unlimited' },
    { feature: 'Portfolio Management (Investor)', free: false, pro: true, premium: true },
    { feature: 'CRM & Email Campaigns', free: false, pro: false, premium: true },
    { feature: 'API Access', free: false, pro: false, premium: true },
    { feature: 'White-label & Custom Domain', free: false, pro: false, premium: true },
    { feature: 'Priority Support', free: false, pro: false, premium: true },
  ];

  const renderCell = (value) => {
    if (value === true) return <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />;
    if (value === false) return <XIcon className="h-5 w-5 text-gray-300 mx-auto" />;
    return <span className="text-sm text-gray-700">{value}</span>;
  };

  return (
    <section className="mt-24">
      <h2 className="text-center text-3xl font-bold text-gray-900">
        Full Feature Comparison
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
        See exactly what you get with each plan.
      </p>

      <div className="mt-10 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Feature</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                Free
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-teal-600">
                Professional
                <span className="block text-xs font-normal text-gray-500">
                  ${cycle === BILLING_CYCLES.YEARLY ? '290/yr' : '29/mo'}
                </span>
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                Premium
                <span className="block text-xs font-normal text-gray-500">
                  ${cycle === BILLING_CYCLES.YEARLY ? '990/yr' : '99/mo'}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.feature} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-700">{row.feature}</td>
                <td className="px-6 py-4 text-center">{renderCell(row.free)}</td>
                <td className="px-6 py-4 text-center bg-teal-50/30">{renderCell(row.pro)}</td>
                <td className="px-6 py-4 text-center">{renderCell(row.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="mt-24 mb-16">
      <h2 className="text-center text-3xl font-bold text-gray-900">
        Frequently Asked Questions
      </h2>

      <div className="mx-auto mt-10 max-w-3xl divide-y divide-gray-200 rounded-xl border border-gray-200">
        {PRICING_FAQ.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="text-sm font-medium text-gray-900">{item.q}</span>
              <svg
                className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-5 text-sm text-gray-600">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState(BILLING_CYCLES.MONTHLY);

  const currentTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;

  const handleSelect = (plan) => {
    if (!isAuthenticated) {
      // Send to register with a redirect-back hint
      router.push(`/register?redirect=/pricing&plan=${plan.id}`);
      return;
    }

    if (plan.id === SUBSCRIPTION_TIERS.FREE) return;

    // TODO: replace with Stripe checkout when integrated
    // For now, route to a placeholder or show a toast
    router.push(
      `/dashboard?upgrade=${plan.id}&cycle=${billingCycle}`
    );
  };

  return (
    <Layout>
      <Head>
        <title>Pricing – pares.homes</title>
        <meta
          name="description"
          content="Choose the right Pares plan for your real estate business — Free, Professional, or Premium."
        />
      </Head>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Whether you&apos;re just browsing or running a brokerage, there&apos;s a
            plan built for you. Start free, upgrade when you&apos;re ready.
          </p>

          <BillingToggle cycle={billingCycle} onChange={setBillingCycle} />
        </div>

        {/* Plan cards */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={billingCycle}
              currentTier={currentTier}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Professional type highlights */}
        <ProfessionalTypeCards />

        {/* Full comparison table */}
        <ComparisonTable cycle={billingCycle} />

        {/* FAQ */}
        <FAQ />

        {/* Final CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 px-8 py-12 text-center text-white shadow-lg">
          <h2 className="text-3xl font-bold">Ready to grow your real estate business?</h2>
          <p className="mx-auto mt-3 max-w-xl text-teal-100">
            Join thousands of agents, brokers, and investors using Pares to
            list, analyze, and close deals faster.
          </p>
          <button
            onClick={() =>
              isAuthenticated
                ? router.push('/dashboard')
                : router.push('/register?redirect=/pricing')
            }
            className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-teal-600 shadow-sm hover:bg-teal-50 transition-colors"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </Layout>
  );
}
