"use client";
import React from 'react';

function asList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw)
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '' || value === 'Unknown') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 text-right break-words max-w-[60%]">{value}</div>
    </div>
  );
}

function PillList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 40).map((item, idx) => (
        <span
          key={idx}
          className="px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-700 text-xs"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

const toneStyles = {
  teal: {
    bar: 'bg-teal-500',
    label: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  emerald: {
    bar: 'bg-emerald-500',
    label: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  amber: {
    bar: 'bg-amber-500',
    label: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  rose: {
    bar: 'bg-rose-500',
    label: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  slate: {
    bar: 'bg-slate-500',
    label: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

function Section({ title, children, tone = 'teal' }) {
  const styles = toneStyles[tone] || toneStyles.teal;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 px-4 sm:px-6 pt-5">
        <span className={`h-3 w-3 rounded-full ${styles.bar}`} aria-hidden="true" />
        <span className={`text-xs font-semibold uppercase tracking-wide border px-2 py-1 rounded-full ${styles.label}`}>
          {title}
        </span>
      </div>
      <div className="p-4 sm:p-6">
      {children}
      </div>
    </div>
  );
}

/**
 * Zillow-style “Facts & Features” blocks.
 * Expects a raw-ish Trestle Property object (RESO fields).
 */
export default function PropertyFactsAndFeatures({ property }) {
  if (!property) return null;

  const price = formatCurrency(property.ListPrice || property.ClosePrice);
  const closePrice = formatCurrency(property.ClosePrice);
  const originalList = formatCurrency(property.OriginalListPrice);
  const taxes = formatCurrency(property.TaxAnnualAmount || property.taxes);

  const sqft = formatNumber(property.LivingArea || property.LivingAreaSqFt || property.LivingAreaSquareFeet);
  const lotAcres = formatNumber(property.LotSizeAcres);
  const lotSqft = formatNumber(property.LotSizeSquareFeet);

  const appliances = asList(property.Appliances);
  const interior = asList(property.InteriorFeatures);
  const exterior = asList(property.ExteriorFeatures);
  const community = asList(property.CommunityFeatures);
  const amenities = asList(property.AssociationAmenities);
  const lotFeatures = asList(property.LotFeatures);

  const basement = property.Basement || property.HasBasement;

  const hoaFee = property.AssociationFee || property.AssociationFee2 || property.AssociationFeeMonthly;

  const pricePerSqft = (() => {
    const p = Number(property.ListPrice || property.ClosePrice);
    const s = Number(property.LivingArea || property.LivingAreaSqFt || property.LivingAreaSquareFeet);
    if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0) return null;
    return formatCurrency(p / s);
  })();

  return (
    <div className="space-y-5">
      <Section title="Key facts" tone="teal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Status" value={property.StandardStatus || property.MlsStatus} />
            <InfoRow label="Price" value={price} />
            <InfoRow label="Price per sq ft" value={pricePerSqft} />
            <InfoRow label="Beds" value={property.BedroomsTotal ?? property.bedrooms} />
            <InfoRow label="Baths" value={property.BathroomsTotalInteger ?? property.bathrooms} />
            <InfoRow label="Living area" value={sqft ? `${sqft} sq ft` : null} />
            <InfoRow label="Lot" value={lotAcres ? `${lotAcres} acres` : lotSqft ? `${lotSqft} sq ft` : null} />
          </div>
          <div>
            <InfoRow label="Property type" value={property.PropertyType || property.propertyType} />
            <InfoRow label="Year built" value={property.YearBuilt} />
            <InfoRow label="Days on market" value={property.DaysOnMarket ?? property.daysOnMarket} />
            <InfoRow label="MLS #" value={property.ListingKey || property.mlsNumber} />
            <InfoRow label="Listing date" value={formatDate(property.ListingContractDate)} />
            <InfoRow label="Close date" value={formatDate(property.CloseDate)} />
            <InfoRow label="Taxes (annual)" value={taxes ? `${taxes}/yr` : null} />
            <InfoRow label="HOA" value={hoaFee ? `${formatCurrency(hoaFee) || hoaFee}/mo` : null} />
          </div>
        </div>
      </Section>

      <Section title="Price & listing" tone="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Original list" value={originalList} />
            <InfoRow label="Current list" value={formatCurrency(property.ListPrice)} />
            <InfoRow label="Sold price" value={closePrice} />
            <InfoRow label="Listing agent" value={property.ListAgentFullName} />
            <InfoRow label="Listing agent phone" value={property.ListAgentPhone} />
            <InfoRow label="Listing office" value={property.ListOfficeName} />
          </div>
          <div>
            <InfoRow label="County" value={property.CountyOrParish} />
            <InfoRow label="Subdivision" value={property.SubdivisionName || property.Subdivision || property.Neighborhood} />
            <InfoRow label="School district" value={property.SchoolDistrict || property.HighSchoolDistrict} />
            <InfoRow label="Zoning" value={property.ZoningDescription} />
            <InfoRow label="Parcel" value={property.ParcelNumber || property.TaxParcelId} />
          </div>
        </div>
      </Section>

      <Section title="Interior" tone="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Rooms" value={property.RoomsTotal} />
            <InfoRow label="Basement" value={typeof basement === 'boolean' ? (basement ? 'Yes' : 'No') : basement} />
            <InfoRow label="Heating" value={property.Heating} />
            <InfoRow label="Cooling" value={property.Cooling} />
            <InfoRow label="Flooring" value={property.Flooring} />
          </div>
          <div>
            <InfoRow label="Fireplaces" value={property.FireplaceNumber} />
            <InfoRow label="Fireplace features" value={property.FireplaceFeatures || property.fireplacefeatures} />
            <InfoRow label="Appliances" value={appliances.length ? null : property.appliances} />
            <PillList items={appliances} />
          </div>
        </div>
        <PillList items={interior} />
      </Section>

      <Section title="Exterior" tone="rose">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Parking" value={property.ParkingTotal ? `${property.ParkingTotal} spaces` : property.ParkingFeatures} />
            <InfoRow label="Garage" value={property.GarageSpaces ? `${property.GarageSpaces} spaces` : null} />
            <InfoRow label="Pool" value={property.PoolPrivateYN || property.pool} />
            <InfoRow label="View" value={property.View || property.view} />
          </div>
          <div>
            <InfoRow label="Construction" value={property.ConstructionMaterials || property.construction} />
            <InfoRow label="Roof" value={property.Roof || property.roof} />
            <InfoRow label="Architectural style" value={property.ArchitecturalStyle || property.style} />
            <InfoRow label="Foundation" value={property.FoundationDetails || property.foundationDetails} />
          </div>
        </div>
        <PillList items={exterior} />
        <PillList items={lotFeatures} />
      </Section>

      <Section title="Utilities & water" tone="slate">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Utilities" value={property.Utilities || property.utilities} />
            <InfoRow label="Water source" value={property.WaterSource || property.waterSource} />
          </div>
          <div>
            <InfoRow label="Sewer" value={property.Sewer || property.sewer} />
            <InfoRow label="Electric" value={property.Electric} />
          </div>
        </div>
      </Section>

      {(community.length || amenities.length) ? (
        <Section title="Community" tone="teal">
          <PillList items={community} />
          <PillList items={amenities} />
        </Section>
      ) : null}
    </div>
  );
}
