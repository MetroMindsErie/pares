import crypto from 'crypto';
import { getSupabaseAdminClient } from './supabaseAdmin';

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',')}}`;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function asDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // Store as YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function asTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function pickSnapshotFields(property) {
  return {
    listing_key: String(property?.ListingKey || property?.listingKey || property?.ListingId || property?.id || ''),
    standard_status: property?.StandardStatus ?? property?.Status ?? null,
    list_price: property?.ListPrice ?? property?.price ?? null,
    close_price: property?.ClosePrice ?? property?.closePrice ?? property?.soldPrice ?? null,
    close_date: asDate(property?.CloseDate ?? property?.closeDate ?? null),

    major_change_type: property?.MajorChangeType ?? null,
    major_change_timestamp: asTimestamp(property?.MajorChangeTimestamp ?? null),
    status_change_timestamp: asTimestamp(property?.StatusChangeTimestamp ?? null),
    price_change_timestamp: asTimestamp(property?.PriceChangeTimestamp ?? null),
    modification_timestamp: asTimestamp(property?.ModificationTimestamp ?? null),

    on_market_date: asDate(property?.OnMarketDate ?? null),
    off_market_date: asDate(property?.OffMarketDate ?? null)
  };
}

function computeSnapshotHash(fields) {
  // Only hash the fields we care about for change detection.
  const hashBasis = {
    standard_status: fields.standard_status,
    list_price: fields.list_price,
    close_price: fields.close_price,
    close_date: fields.close_date,
    major_change_type: fields.major_change_type,
    major_change_timestamp: fields.major_change_timestamp,
    status_change_timestamp: fields.status_change_timestamp,
    price_change_timestamp: fields.price_change_timestamp,
    on_market_date: fields.on_market_date,
    off_market_date: fields.off_market_date,
    modification_timestamp: fields.modification_timestamp
  };
  return sha256(stableStringify(hashBasis));
}

function chooseEventAt(preferredIso, fallbackIso) {
  return preferredIso || fallbackIso || new Date().toISOString();
}

function dateToIsoStartOfDay(dateOrString) {
  if (!dateOrString) return null;
  // Accept YYYY-MM-DD or any date string parseable by Date.
  const d = new Date(dateOrString);
  if (Number.isNaN(d.getTime())) return null;
  const yyyyMmDd = d.toISOString().slice(0, 10);
  return `${yyyyMmDd}T00:00:00.000Z`;
}

export async function recordPropertyViewSnapshot(property) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, skipped: true, reason: 'supabase-admin-not-configured' };

  const fields = pickSnapshotFields(property);
  if (!fields.listing_key) return { ok: false, skipped: true, reason: 'missing-listing-key' };

  const snapshot = {
    ...fields,
    // keep a minimal raw snapshot (avoid huge payloads)
    raw: {
      ListingKey: property?.ListingKey,
      StandardStatus: property?.StandardStatus,
      ListPrice: property?.ListPrice,
      ClosePrice: property?.ClosePrice,
      CloseDate: property?.CloseDate,
      MajorChangeType: property?.MajorChangeType,
      MajorChangeTimestamp: property?.MajorChangeTimestamp,
      StatusChangeTimestamp: property?.StatusChangeTimestamp,
      PriceChangeTimestamp: property?.PriceChangeTimestamp,
      OnMarketDate: property?.OnMarketDate,
      OffMarketDate: property?.OffMarketDate,
      ModificationTimestamp: property?.ModificationTimestamp
    }
  };

  const snapshotHash = computeSnapshotHash(fields);

  // Fetch previous snapshot (latest)
  const { data: prev, error: prevErr } = await supabase
    .from('property_view_snapshots')
    .select('id, snapshot_hash, standard_status, list_price, close_price, close_date, major_change_type, major_change_timestamp, status_change_timestamp, price_change_timestamp, modification_timestamp, on_market_date, off_market_date, captured_at')
    .eq('listing_key', fields.listing_key)
    .order('captured_at', { ascending: false })
    .limit(1);

  if (prevErr) {
    // Table might not exist yet.
    return { ok: false, error: prevErr };
  }

  const previous = Array.isArray(prev) && prev.length ? prev[0] : null;
  if (previous?.snapshot_hash === snapshotHash) {
    return { ok: true, skipped: true, reason: 'no-change' };
  }

  // Insert snapshot (ignore duplicates from concurrent views)
  const { error: insertErr } = await supabase
    .from('property_view_snapshots')
    .insert({
      listing_key: fields.listing_key,
      snapshot_hash: snapshotHash,
      snapshot,
      standard_status: fields.standard_status,
      list_price: fields.list_price,
      close_price: fields.close_price,
      close_date: fields.close_date,
      major_change_type: fields.major_change_type,
      major_change_timestamp: fields.major_change_timestamp,
      status_change_timestamp: fields.status_change_timestamp,
      price_change_timestamp: fields.price_change_timestamp,
      modification_timestamp: fields.modification_timestamp,
      on_market_date: fields.on_market_date,
      off_market_date: fields.off_market_date
    });

  if (insertErr) {
    // Unique violation or missing table. Either way, don’t crash page.
    return { ok: false, error: insertErr };
  }

  // Create events
  const events = [];
  if (!previous) {
    events.push({
      listing_key: fields.listing_key,
      event_at: new Date().toISOString(),
      event_type: 'first_seen',
      event_label: 'First Seen',
      old_value: null,
      new_value: { standard_status: fields.standard_status, list_price: fields.list_price },
      source: 'property_view'
    });

    // Best-effort “backfill” from the single MLS record: we can’t get full historical deltas
    // from Trestle, but we can at least show key known timestamps immediately.
    const listedAt =
      dateToIsoStartOfDay(property?.OnMarketDate) ||
      dateToIsoStartOfDay(property?.ListingContractDate);
    if (listedAt) {
      events.push({
        listing_key: fields.listing_key,
        event_at: listedAt,
        event_type: 'listed',
        event_label: 'Listed',
        old_value: null,
        new_value: { standard_status: fields.standard_status, list_price: fields.list_price },
        source: 'mls_fields'
      });
    }

    const originalListPrice = property?.OriginalListPrice;
    if (
      originalListPrice !== null &&
      originalListPrice !== undefined &&
      fields.list_price !== null &&
      fields.list_price !== undefined &&
      Number(originalListPrice) !== Number(fields.list_price)
    ) {
      const at =
        fields.price_change_timestamp ||
        fields.modification_timestamp ||
        listedAt ||
        new Date().toISOString();
      events.push({
        listing_key: fields.listing_key,
        event_at: at,
        event_type: 'price_change',
        event_label: 'Price Change',
        old_value: { list_price: Number(originalListPrice) },
        new_value: { list_price: Number(fields.list_price) },
        source: 'mls_fields'
      });
    }
  } else {
    // Status change
    if ((previous.standard_status ?? null) !== (fields.standard_status ?? null)) {
      events.push({
        listing_key: fields.listing_key,
        event_at: chooseEventAt(fields.status_change_timestamp, fields.modification_timestamp),
        event_type: 'status_change',
        event_label: 'Status Change',
        old_value: { standard_status: previous.standard_status },
        new_value: { standard_status: fields.standard_status },
        source: 'snapshot_diff'
      });
    }

    // Price change
    if ((previous.list_price ?? null) !== (fields.list_price ?? null)) {
      events.push({
        listing_key: fields.listing_key,
        event_at: chooseEventAt(fields.price_change_timestamp, fields.modification_timestamp),
        event_type: 'price_change',
        event_label: 'Price Change',
        old_value: { list_price: previous.list_price },
        new_value: { list_price: fields.list_price },
        source: 'snapshot_diff'
      });
    }

    // Major change (if provided)
    if ((previous.major_change_type ?? null) !== (fields.major_change_type ?? null) ||
        (previous.major_change_timestamp ?? null) !== (fields.major_change_timestamp ?? null)) {
      if (fields.major_change_type || fields.major_change_timestamp) {
        events.push({
          listing_key: fields.listing_key,
          event_at: chooseEventAt(fields.major_change_timestamp, fields.modification_timestamp),
          event_type: 'major_change',
          event_label: 'Major Change',
          old_value: { major_change_type: previous.major_change_type, major_change_timestamp: previous.major_change_timestamp },
          new_value: { major_change_type: fields.major_change_type, major_change_timestamp: fields.major_change_timestamp },
          source: 'snapshot_diff'
        });
      }
    }

    // Sold
    if ((previous.close_date ?? null) !== (fields.close_date ?? null) || (previous.close_price ?? null) !== (fields.close_price ?? null)) {
      if (fields.close_date || fields.close_price) {
        events.push({
          listing_key: fields.listing_key,
          event_at: chooseEventAt(fields.close_date ? `${fields.close_date}T00:00:00.000Z` : null, fields.modification_timestamp),
          event_type: 'sale_recorded',
          event_label: 'Sale Recorded',
          old_value: { close_date: previous.close_date, close_price: previous.close_price },
          new_value: { close_date: fields.close_date, close_price: fields.close_price },
          source: 'snapshot_diff'
        });
      }
    }
  }

  if (events.length) {
    const { error: eventsErr } = await supabase.from('property_history_events').insert(events);
    if (eventsErr) {
      return { ok: false, error: eventsErr };
    }
  }

  return { ok: true, inserted: true, eventsInserted: events.length };
}

export async function getPropertyHistoryEvents(listingKey) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const key = String(listingKey || '').trim();
  if (!key) return [];

  const { data, error } = await supabase
    .from('property_history_events')
    .select('event_at, event_type, event_label, old_value, new_value, source')
    .eq('listing_key', key)
    .order('event_at', { ascending: false })
    .limit(250);

  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export function eventsToListingHistoryRows(events, context = null) {
  const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString() + ' @ ' + d.toLocaleTimeString();
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const formatMoney = (n) => {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (!Number.isFinite(num)) return '';
    return `$${num.toLocaleString()}`;
  };

  const imageUrl =
    context?.mediaUrls?.[0] ||
    context?.images?.[0] ||
    context?.imageUrl ||
    '/fallback-property.jpg';
  const listingId = context?.ListingKey || context?.listingKey || context?.ListingId || context?.id || 'Unknown';
  const propType = context?.PropertyType || context?.propertyType || 'RES';
  const address = context?.UnparsedAddress || context?.address || 'Address not available';

  return (Array.isArray(events) ? events : []).map((e) => {
    const newPrice = e?.new_value?.list_price;
    const oldPrice = e?.old_value?.list_price;
    const price = e?.event_type === 'price_change' ? formatMoney(newPrice) : '';
    const changeDetails = e?.event_type === 'price_change'
      ? `${formatMoney(oldPrice)} → ${formatMoney(newPrice)}`
      : e?.event_type === 'status_change'
        ? `${e?.old_value?.standard_status ?? ''} → ${e?.new_value?.standard_status ?? ''}`
        : e?.event_type === 'major_change'
          ? `${e?.new_value?.major_change_type ?? 'Major update'}`
          : e?.event_type === 'sale_recorded'
            ? `${formatMoney(e?.new_value?.close_price)}`
            : '';

    return {
      dom: '',
      changeType: e?.event_label || e?.event_type || 'Update',
      price: price || (e?.event_type === 'sale_recorded' ? formatMoney(e?.new_value?.close_price) : ''),
      changeDetails: changeDetails || '',
      whenChanged: formatDateTime(e?.event_at),
      effDate: formatDate(e?.event_at),
      modBy: 'SYSTEM',
      listingId,
      propType,
      address,
      imageUrl
    };
  });
}
