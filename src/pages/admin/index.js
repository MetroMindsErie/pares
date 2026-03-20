import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/auth-context';
import supabase from '../../lib/supabase-setup';

const TABS = [
  { id: 'contacts', label: 'Contact Messages' },
  { id: 'subscribers', label: 'Newsletter Subscribers' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

async function fetchWithAuth(url) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function AdminDashboard() {
  const { isSuperAdmin, authChecked, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedContact, setExpandedContact] = useState(null);
  const [search, setSearch] = useState('');

  // Guard: redirect non-admins
  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (!isSuperAdmin()) { router.replace('/dashboard'); }
  }, [authChecked, isAuthenticated, isSuperAdmin, router]);

  const loadData = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'contacts') {
        const { data } = await fetchWithAuth('/api/admin/contacts');
        setContacts(data || []);
      } else {
        const { data } = await fetchWithAuth('/api/admin/subscribers');
        setSubscribers(data || []);
      }
    } catch (err) {
      setError(err.message === '403' ? 'Access denied.' : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked && isAuthenticated && isSuperAdmin()) {
      loadData(activeTab);
    }
  }, [activeTab, authChecked, isAuthenticated, isSuperAdmin, loadData]);

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.sender_name?.toLowerCase().includes(q) ||
      c.sender_email?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q);
  });

  const filteredSubscribers = subscribers.filter(s =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!authChecked) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-teal-500 rounded-full border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!isSuperAdmin()) return null;

  return (
    <Layout>
      <Head>
        <title>Admin Dashboard | pares.homes</title>
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Contact submissions and newsletter subscribers</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Contacts" value={contacts.length} color="teal" />
            <StatCard label="Unread (today)" value={contacts.filter(c => isToday(c.created_at)).length} color="green" />
            <StatCard label="Subscribers" value={subscribers.length} color="sky" />
            <StatCard label="New Today" value={subscribers.filter(s => isToday(s.created_at)).length} color="violet" />
          </div>

          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearch(''); setExpandedContact(null); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-xs opacity-70">
                    {tab.id === 'contacts' ? contacts.length : subscribers.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeTab === 'contacts' ? 'Search name, email, message…' : 'Search email…'}
                className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
              />
              <button
                onClick={() => loadData(activeTab)}
                className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:text-white text-sm transition"
                title="Refresh"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-slate-800/60 rounded-2xl ring-1 ring-white/10 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-teal-500 rounded-full border-t-transparent" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-400 text-sm">{error}</div>
            ) : activeTab === 'contacts' ? (
              <ContactsTable
                rows={filteredContacts}
                expandedId={expandedContact}
                onExpand={setExpandedContact}
              />
            ) : (
              <SubscribersTable rows={filteredSubscribers} />
            )}
          </div>

        </div>
      </main>
    </Layout>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StatCard({ label, value, color }) {
  const colors = {
    teal: 'from-teal-500/20 border-teal-500/30 text-teal-300',
    green: 'from-green-500/20 border-green-500/30 text-green-300',
    sky: 'from-sky-500/20 border-sky-500/30 text-sky-300',
    violet: 'from-violet-500/20 border-violet-500/30 text-violet-300',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${colors[color]} p-4`}>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function ContactsTable({ rows, expandedId, onExpand }) {
  if (!rows.length) {
    return <p className="text-center py-16 text-slate-400 text-sm">No contact messages found.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <Th>Date</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Agent</Th>
            <Th>Property</Th>
            <Th>Message</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isOpen = expandedId === row.id;
            return (
              <React.Fragment key={row.id}>
                <tr
                  onClick={() => onExpand(isOpen ? null : row.id)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                >
                  <Td className="text-slate-400 whitespace-nowrap">{formatDate(row.created_at)}</Td>
                  <Td>{row.sender_name || <span className="text-slate-500">—</span>}</Td>
                  <Td>
                    {row.sender_email ? (
                      <a href={`mailto:${row.sender_email}`} onClick={e => e.stopPropagation()} className="text-teal-400 hover:underline">
                        {row.sender_email}
                      </a>
                    ) : <span className="text-slate-500">—</span>}
                  </Td>
                  <Td className="text-slate-400 text-xs">{row.agent_email || '—'}</Td>
                  <Td>
                    {row.property_url ? (
                      <a href={row.property_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-teal-400 hover:underline text-xs truncate max-w-[120px] block">
                        {row.property_url}
                      </a>
                    ) : <span className="text-slate-500">—</span>}
                  </Td>
                  <Td className="max-w-[200px]">
                    <span className="truncate block text-slate-300">{row.message}</span>
                  </Td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-700/40">
                    <td colSpan={6} className="px-6 py-4">
                      <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Full message</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{row.message}</p>
                      {row.sender_email && (
                        <a
                          href={`mailto:${row.sender_email}?subject=Re: Your inquiry`}
                          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-teal-500 to-green-500 text-white text-xs font-semibold"
                        >
                          Reply via email
                        </a>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubscribersTable({ rows }) {
  if (!rows.length) {
    return <p className="text-center py-16 text-slate-400 text-sm">No subscribers yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <Th>#</Th>
            <Th>Email</Th>
            <Th>Subscribed</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.email} className="border-b border-white/5 hover:bg-white/5 transition">
              <Td className="text-slate-500">{i + 1}</Td>
              <Td>
                <a href={`mailto:${row.email}`} className="text-teal-400 hover:underline">{row.email}</a>
              </Td>
              <Td className="text-slate-400 whitespace-nowrap">{formatDate(row.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-white ${className}`}>{children}</td>;
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}
