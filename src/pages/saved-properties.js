import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import Layout from '../components/Layout';
import Link from 'next/link';
import SavedProperties from '../components/Dashboard/SavedProperties';
import CompareModal from '../components/Dashboard/CompareModal';
import { printAllPropertiesPdf } from '../utils/pdfTemplate';
import { getPropertyDetails } from '../services/trestleServices';
import clsx from 'clsx';

const SavedPropertiesPage = () => {
  const router = useRouter();
  const { user, loading: authLoading, authChecked } = useAuth();
  const [savedProperties, setSavedProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [deleteError, setDeleteError] = useState(null);
  // Compare feature state
  const MAX_COMPARE = 4;
  const [compareIds, setCompareIds] = useState([]); // array of listing keys / property ids
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const announceRef = useRef(null);
  // Page-level enrichment so PDF buttons in the compact list use full MLS data
  const [enrichedMap, setEnrichedMap] = useState({});
  const [isEnrichingAll, setIsEnrichingAll] = useState(false);

  // Enrich saved properties that lack full MLS detail via Trestle API.
  // cleanPropertyData() in swipeUtils strips records to ~14 essential fields;
  // full MLS records have 50+ fields.  Detect the slim version and re-fetch.
  useEffect(() => {
    if (!savedProperties || savedProperties.length === 0) return;
    const toEnrich = savedProperties.filter((p) => {
      const pd = p.property_data;
      if (!pd || typeof pd !== 'object') return true;
      // Minimal cleaned data has ≤15 keys — always re-fetch full detail
      return Object.keys(pd).length < 20;
    });
    if (toEnrich.length === 0) return;

    let mounted = true;
    setIsEnrichingAll(true);
    Promise.all(
      toEnrich.map(async (p) => {
        const key = p.listing_key || p.property_id;
        if (!key) return [p.id, p];
        try {
          const full = await getPropertyDetails(String(key));
          if (!full) return [p.id, p];
          return [p.id, { ...p, ...full, property_data: full, saved_at: p.saved_at, id: p.id, user_id: p.user_id }];
        } catch {
          return [p.id, p];
        }
      })
    ).then((results) => {
      if (!mounted) return;
      const next = {};
      results.forEach(([id, enriched]) => { next[id] = enriched; });
      setEnrichedMap(next);
      setIsEnrichingAll(false);
    });
    return () => { mounted = false; };
  }, [savedProperties]);

  /** Get enriched version of a property (falls back to original row) */
  const getEnriched = (p) => enrichedMap[p.id] || p;

  /** Export ALL saved properties to a single multi-page PDF */
  const handleExportAllPdf = () => {
    const enriched = savedProperties.map(getEnriched);
    printAllPropertiesPdf(enriched);
  };

  // Redirect unauthenticated users once auth has finished initializing
  useEffect(() => {
    if (authChecked && !authLoading && !user) {
      router.replace('/login?redirect=/saved-properties');
    }
  }, [authChecked, authLoading, user, router]);

  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user?.id) {
        // Auth still loading or no user – stop the spinner without data
        if (authChecked) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', user.id)
          .order('saved_at', { ascending: false });

        if (error) throw error;
        setSavedProperties(data || []);
      } catch (err) {
        console.error('Error fetching saved properties:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedProperties();
  }, [user?.id, authChecked]);

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (announceRef.current) announceRef.current.textContent = `Removed from comparison. ${next.length} selected.`;
        return next;
      }
      if (prev.length >= MAX_COMPARE) {
        if (announceRef.current) announceRef.current.textContent = `Max ${MAX_COMPARE} properties can be compared.`;
        return prev;
      }
      const next = [...prev, id];
      if (announceRef.current) announceRef.current.textContent = `Added to comparison. ${next.length} selected.`;
      return next;
    });
  };

  const clearCompare = () => {
    setCompareIds([]);
    if (announceRef.current) announceRef.current.textContent = 'Cleared comparison selection.';
  };

  const openCompareModal = () => {
    if (compareIds.length < 2) {
      if (announceRef.current) announceRef.current.textContent = 'Select at least two properties to compare.';
      return;
    }
    setIsCompareOpen(true);
  };

  const deleteSavedProperty = async (rowId) => {
    if (!rowId || !user?.id) return;
    setDeleteError(null);
    setDeletingIds(prev => new Set(prev).add(rowId));
    // optimistic update
    const prevProps = savedProperties;
    const nextProps = prevProps.filter(p => p.id !== rowId);
    setSavedProperties(nextProps);
    setCompareIds(ids => ids.filter(cid => {
      // ensure any compare id that matched this row is removed
      const row = prevProps.find(p => p.id === rowId);
      const toRemove = String(row?.listing_key || row?.property_id || row?.id || JSON.stringify(row));
      return cid !== toRemove;
    }));

    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('id', rowId)
        .eq('user_id', user.id);

      if (error) {
        setDeleteError('Failed to delete. Please retry.');
        // rollback on error
        setSavedProperties(prevProps);
      } else {
        if (announceRef.current) announceRef.current.textContent = 'Property removed.';
      }
    } catch (err) {
      setDeleteError('Unexpected delete error.');
      setSavedProperties(prevProps);
    } finally {
      setDeletingIds(prev => {
        const s = new Set(prev);
        s.delete(rowId);
        return s;
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex justify-center items-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#2563EB] rounded-full border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 py-12">
        {/* Top hero banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-[#2563EB]/10 via-white to-white shadow-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Your Saved Properties</h1>
              <p className="mt-1 text-sm text-slate-600 max-w-xl">
                Curate and compare properties you love. Select up to {MAX_COMPARE} items to view a detailed side-by-side comparison.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100 text-center">
                <div className="text-sm text-slate-500">Saved</div>
                <div className="text-xl font-bold text-[#2563EB]">{savedProperties.length}</div>
              </div>

              <div className="flex gap-2">
                <Link href="/swipe" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:brightness-95 shadow">
                  Browse Properties
                </Link>
                {savedProperties.length > 0 && (
                  <button
                    onClick={handleExportAllPdf}
                    disabled={isEnrichingAll}
                    className={clsx(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow border transition',
                      isEnrichingAll
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-wait'
                        : 'bg-white border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5'
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {isEnrichingAll ? 'Loading data…' : `Export All (${savedProperties.length}) to PDF`}
                  </button>
                )}
                <button onClick={() => { clearCompare(); setCompareIds([]); }} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-700 hover:bg-gray-50">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div aria-live="polite" className="sr-only" ref={announceRef} />

          <SavedProperties 
            properties={savedProperties}
            isLoading={isLoading}
            error={error}
            onDelete={deleteSavedProperty}
            deletingIds={deletingIds}
            compareIds={compareIds}
            toggleCompare={toggleCompare}
            openCompareModal={openCompareModal}
            clearCompare={clearCompare}
            maxCompare={MAX_COMPARE}
            getEnriched={getEnriched}
            isEnrichingAll={isEnrichingAll}
          />

          {/* Sticky compare trays & modal (unchanged functionality but visually consistent) */}
          {compareIds.length > 0 && (
            <>
              <div className="fixed bottom-4 right-4 z-50 hidden md:flex items-center gap-3 bg-white rounded-xl shadow-lg px-4 py-2 ring-1 ring-black/6">
                <div className="flex gap-2 overflow-x-auto max-w-[520px]">
                  {compareIds.map(id => {
                    const p = savedProperties.find(sp => String(sp.listing_key || sp.property_id || sp.id || JSON.stringify(sp)) === String(id));
                    if (!p) return null;
                    return (
                      <div key={id} className="w-20 h-14 rounded-md overflow-hidden relative ring-1 ring-gray-100">
                        <img src={p.image_url || '/fallback-property.jpg'} alt={p.address || 'property'} className="w-full h-full object-cover" loading="lazy" />
                        <button onClick={() => toggleCompare(String(id))} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm" aria-label={`Remove ${p.address || 'property'} from compare`}>✕</button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openCompareModal} className="px-3 py-2 bg-[#2563EB] text-white rounded-md shadow-sm">Compare ({compareIds.length})</button>
                  <button onClick={clearCompare} className="p-2 text-gray-500 rounded-md" title="Clear">Clear</button>
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-white border-t border-gray-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-x-auto">
                  {compareIds.map(id => {
                    const p = savedProperties.find(sp => String(sp.listing_key || sp.property_id || sp.id || JSON.stringify(sp)) === String(id));
                    if (!p) return null;
                    return <img key={id} src={p.image_url || '/fallback-property.jpg'} alt={p.address || 'property'} className="w-16 h-12 rounded-md object-cover" loading="lazy" />;
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openCompareModal} className="px-3 py-2 bg-[#2563EB] text-white rounded-md">Compare</button>
                  <button onClick={clearCompare} className="px-2 py-2 text-gray-500">Clear</button>
                </div>
              </div>
            </>
          )}

          <CompareModal
            open={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            properties={savedProperties.filter(sp => compareIds.includes(String(sp.listing_key || sp.property_id || sp.id || JSON.stringify(sp))))}
            allSelectedIds={compareIds}
          />
        </div>
      </div>
    </Layout>
  );
};

export default SavedPropertiesPage;
