import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import BuyerAgent from '../../components/Property/BuyerAgent';
import AgentPropertiesSection from '../../components/AgentPropertiesSection';
import { getAgentProperties } from '../../services/trestleServices';
import Turnstile from '../../components/Turnstile';

const AGENT = {
  name: 'John D. Easter',
  title: 'Buyer Agent',
  agency: 'Pennington Lines',
  phone: '814-873-5810',
  email: 'easterjo106@yahoo.com',
  photo: '/dad.PNG',
  bio: `John D. Easter brings 15+ years of local market expertise to buyers in Erie and the surrounding region. He focuses on transparent communication, fast MLS search results, and finding properties that fit both lifestyle and investment goals. John's hands-on approach and deep local relationships help clients move confidently from search to close.`,
  specialties: ['Lakefront & Waterfront', 'Downtown Condos', 'Investment Properties', 'First-time Buyers']
};

export default function JohnEasterAgent() {
  const [form, setForm] = useState({ name: '', email: '', message: '', propertyUrl: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [submitMessage, setSubmitMessage] = useState('');
  const [agentProperties, setAgentProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  useEffect(() => {
    const loadAgentProperties = async () => {
      try {
        setLoadingProperties(true);
        const properties = await getAgentProperties({ email: AGENT.email });
        setAgentProperties(properties || []);
      } catch (error) {
        console.error('Error loading agent properties:', error);
        setAgentProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };

    loadAgentProperties();
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      setSubmitStatus('error');
      setSubmitMessage('Please enter a message.');
      return;
    }
    if (!turnstileToken) {
      setSubmitStatus('error');
      setSubmitMessage('Please complete the security check.');
      return;
    }
    setSubmitStatus('loading');
    setSubmitMessage('');
    try {
      const tvRes = await fetch('/api/turnstile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!tvRes.ok) {
        setSubmitStatus('error');
        setSubmitMessage('Security verification failed. Please try again.');
        setTurnstileToken('');
        return;
      }
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, agentEmail: AGENT.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Message sent! John will be in touch soon.');
        setForm({ name: '', email: '', message: '', propertyUrl: '' });
        setTurnstileToken('');
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitStatus('error');
      setSubmitMessage('Network error. Please try again.');
    }
  };

  return (
    <Layout>
      <Head>
        <title>{AGENT.name} — Buyer Agent | Pares</title>
        <meta name="description" content={`Contact ${AGENT.name}, ${AGENT.title} at ${AGENT.agency}.`} />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-teal-900 absolute inset-0 opacity-95" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Photo & quick contact */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="rounded-full p-1 bg-gradient-to-tr from-teal-400 to-green-500">
                  <img
                    src={AGENT.photo}
                    alt={AGENT.name}
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white object-cover border-4 border-white/30 shadow-xl"
                    onError={(e) => { e.target.src = '/default-agent.jpg'; }}
                  />
                </div>

                <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-white text-center lg:text-left">
                  {AGENT.name}
                </h1>
                <p className="text-sm text-teal-200 mt-1">{AGENT.title} • {AGENT.agency}</p>

                <div className="mt-4 w-full lg:w-auto flex flex-col gap-3">
                  <a href={`tel:${AGENT.phone}`} className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m-6 8v6a2 2 0 002 2h6" /></svg>
                    Call {AGENT.phone}
                  </a>

                  <a href={`mailto:${AGENT.email}`} className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12H8m8-4H8m2 8H8" /></svg>
                    Email {AGENT.name}
                  </a>

                  <a href="/saved-properties" className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/5 transition">
                    View Saved Properties
                  </a>
                </div>
              </div>

              {/* Bio + specialties */}
              <div className="text-white">
                <div className="bg-white/6 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/6 shadow-md">
                  <h2 className="text-lg font-semibold text-white">About {AGENT.name}</h2>
                  <p className="mt-3 text-sm text-teal-100 max-w-prose leading-relaxed">
                    {AGENT.bio}
                  </p>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-teal-200">Specialties</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {AGENT.specialties.map(s => (
                        <span key={s} className="text-xs bg-white/10 text-white px-3 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <h4 className="text-sm font-semibold text-teal-100">Client-first approach</h4>
                      <p className="text-xs text-teal-200 mt-2">Tailored search, clear communication, and negotiation support through closing.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <h4 className="text-sm font-semibold text-teal-100">Local market knowledge</h4>
                      <p className="text-xs text-teal-200 mt-2">Deep connections across Erie to uncover off-market opportunities and insights.</p>
                    </div>
                  </div>

                  {/* Contact form */}
                  <form className="mt-6" onSubmit={handleSubmit}>
                    <h3 className="text-sm font-semibold text-teal-200">Contact {AGENT.name}</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="px-3 py-3 rounded-md bg-white/10 border border-white/6 text-white text-sm focus:outline-none" />
                      <input name="email" value={form.email} onChange={handleChange} placeholder="Your email" className="px-3 py-3 rounded-md bg-white/10 border border-white/6 text-white text-sm focus:outline-none" />
                      <input name="propertyUrl" value={form.propertyUrl} onChange={handleChange} placeholder="Property URL (optional)" className="col-span-1 sm:col-span-2 px-3 py-2 rounded-md bg-white/10 border border-white/6 text-white text-sm focus:outline-none" />
                      <textarea name="message" value={form.message} onChange={handleChange} rows="4" placeholder="Write a short message..." className="col-span-1 sm:col-span-2 px-3 py-2 rounded-md bg-white/10 border border-white/6 text-white text-sm focus:outline-none" />
                    </div>

                    <Turnstile onVerify={setTurnstileToken} theme="dark" size="compact" className="mt-3" />

                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={submitStatus === 'loading'}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-teal-400 to-green-500 text-white font-semibold shadow hover:scale-[1.02] transition disabled:opacity-60"
                        >
                          {submitStatus === 'loading' ? 'Sending…' : 'Send Message'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setForm({ name:'', email:'', message:'', propertyUrl:'' }); setSubmitStatus(null); setTurnstileToken(''); }}
                          className="px-3 py-2 rounded-md border border-white/10 text-white"
                        >
                          Clear
                        </button>
                      </div>
                      {submitStatus === 'success' && (
                        <p className="text-sm text-green-300">{submitMessage}</p>
                      )}
                      {submitStatus === 'error' && (
                        <p className="text-sm text-red-400">{submitMessage}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        Or email directly: <a href={`mailto:${AGENT.email}`} className="text-teal-300 hover:underline">{AGENT.email}</a>
                      </p>
                    </div>
                  </form>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Properties Section - Now Prominent */}
        {loadingProperties ? (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-10 w-10 border-4 border-teal-500 rounded-full border-t-transparent"></div>
            </div>
          </section>
        ) : (
          <AgentPropertiesSection agentName={AGENT.name} properties={agentProperties} />
        )}

        {/* Secondary section with embedded BuyerAgent component for consistency */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <BuyerAgent />
        </section>
      </main>
    </Layout>
  );
}
