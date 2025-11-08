import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import SavedProperties from '../components/Dashboard/SavedProperties';
import CompareModal from '../components/Dashboard/CompareModal';
import clsx from 'clsx';

const SavedPropertiesPage = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user?.id) return;

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
  }, [user?.id]);

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
                <button onClick={() => { clearCompare(); setCompareIds([]); }} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-700 hover:bg-gray-50">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compare controls panel */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-l-4 border-[#2563EB]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Compare & Manage</h2>
                <p className="text-sm text-slate-500">Select properties below to build a comparison.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openCompareModal}
                  className={clsx(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition',
                    compareIds.length >= 2 ? 'bg-[#2563EB] text-white hover:bg-[#2563EB]/90' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  )}
                  aria-disabled={compareIds.length < 2}
                >
                  Compare {compareIds.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-white text-[#2563EB] rounded-full">{compareIds.length}</span>}
                </button>
                <button onClick={clearCompare} className="px-3 py-2 rounded-md text-gray-600 bg-white border border-gray-200">Clear</button>
              </div>
            </div>

            {/* compact selector list */}
            <div className="mt-4">
              {savedProperties.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center bg-white/60">
                  <div className="mx-auto max-w-md">
                    <svg className="mx-auto w-12 h-12 text-[#2563EB] mb-3" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M6 7v13h12V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <h3 className="text-lg font-semibold text-slate-900">No saved properties yet</h3>
                    <p className="mt-2 text-sm text-slate-500">Save properties from listings to see them here. Use the browse button to get started.</p>
                    <div className="mt-4 flex justify-center gap-3">
                      <Link href="/swipe" className="inline-flex items-center px-4 py-2 bg-[#2563EB] text-white rounded-lg">Browse Listings</Link>
                      <Link href="/" className="inline-flex items-center px-4 py-2 bg-white border rounded-lg">Home</Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {savedProperties.map((p) => {
                    const id = p.listing_key || p.property_id || p.id || JSON.stringify(p);
                    const selected = compareIds.includes(String(id));
                    const price = p.price || p.listing_price || p.price;
                    const thumb = p.image_url || '/fallback-property.jpg';
                    const rowId = p.id; // actual table row id
                    const isDeleting = deletingIds.has(rowId);
                    return (
                      <div key={String(id)} className={clsx('flex items-center gap-4 p-3 rounded-lg transition-shadow', selected ? 'ring-2 ring-[#2563EB]/30 bg-white' : 'bg-white hover:shadow-lg')}>
                        <img src={thumb} alt={p.address} className="w-36 h-24 object-cover rounded-lg shadow-sm" loading="lazy" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{price ? `$${Number(price).toLocaleString()}` : '—'}</div>
                          <div className="text-xs text-slate-500 truncate">{p.address}</div>
                          <div className="text-xs text-slate-400 mt-1">Saved {new Date(p.saved_at).toLocaleDateString()}</div>
                          {deleteError && <div className="text-xs text-red-500 mt-1">{deleteError}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Link href={`/property/${p.listing_key || p.property_id || p.id}`} className="text-sm text-slate-700 underline">View</Link>
                          <button
                            onClick={() => toggleCompare(String(id))}
                            className={clsx('px-3 py-2 rounded-md border text-sm', selected ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-gray-200 text-slate-700')}
                            disabled={isDeleting}
                          >
                            {selected ? 'Selected' : 'Compare'}
                          </button>
                          <button
                            onClick={() => deleteSavedProperty(rowId)}
                            disabled={isDeleting}
                            className={clsx(
                              'px-3 py-2 rounded-md text-sm border transition',
                              isDeleting
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            )}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div aria-live="polite" className="sr-only" ref={announceRef} />
          </div>

          {/* Full grid below (keeps existing SavedProperties component for detailed grid view) */}
          <div className="mt-6">
            <SavedProperties 
              properties={savedProperties}
              isLoading={isLoading}
              error={error}
              onDelete={deleteSavedProperty}
              deletingIds={deletingIds}
            />
          </div>

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
