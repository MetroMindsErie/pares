import React from 'react';
import PropTypes from 'prop-types';

export const TaxInformation = ({ taxData }) => {
  if (!taxData) return null;
  return (
    <div className="space-y-10">
      {/* Owner Information */}
      <Section title="Owner Information" tone="indigo">
        <Grid3 items={[
          ['Owner Name', taxData.ownerInformation.ownerName],
          ['Mailing Address', taxData.ownerInformation.mailingAddress],
          ['Tax Billing City & State', taxData.ownerInformation.taxBillingCity],
          ['Tax Billing Zip', taxData.ownerInformation.taxBillingZip],
          ['Owner Occupied', taxData.ownerInformation.ownerOccupied]
        ]}/>
      </Section>

      {/* Location Information */}
      <Section title="Location Information" tone="emerald">
        <Grid3 items={[
          ['School District', taxData.locationInformation.schoolDistrict],
          ['Census Track', taxData.locationInformation.censusTrack],
          ['Zoning', taxData.locationInformation.zoning],
          ['Subdivision', taxData.locationInformation.subdivision],
          ['Map Page/Grid', taxData.locationInformation.mapPageGrid],
          ['Topography', taxData.locationInformation.topography]
        ]}/>
      </Section>

      {/* Tax Information */}
      <Section title="Tax Breakdown" tone="amber">
        <Grid3 items={[
          ['Tax ID', taxData.taxInformation.taxId],
          ['Legal Description', taxData.taxInformation.legalDescription],
          ['Township Tax', taxData.taxInformation.townshipTax],
          ['County Tax', taxData.taxInformation.countyTax],
          ['School Tax', taxData.taxInformation.schoolTax],
          ['Tax Year', taxData.taxInformation.taxYear]
        ]}/>
      </Section>

      {/* Assessment & Taxes */}
      <Section title="Assessment & Taxes (Recent Years)" tone="slate">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Assessment Year</Th>
                {taxData.assessmentAndTaxes.assessmentYears.map(y => <Th key={y}>{y}</Th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <Row label="Assessed Value - Total" values={taxData.assessmentAndTaxes.assessedValueTotal}/>
              <Row label="Assessed Value - Land" values={taxData.assessmentAndTaxes.assessedValueLand} alt />
              <Row label="Assessed Value - Improved" values={taxData.assessmentAndTaxes.assessedValueImproved}/>
              <Row label="Market Value - Total" values={taxData.assessmentAndTaxes.marketValueTotal} alt />
              <Row label="Market Value - Land" values={taxData.assessmentAndTaxes.marketValueLand}/>
              <Row label="Market Value - Improved" values={taxData.assessmentAndTaxes.marketValueImproved} alt />
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export const HistoryInformation = ({ historyData }) => {
  if (!historyData) return null;
  return (
    <div className="space-y-10">
      {/* Listing History */}
      <Section title="Listing History" tone="indigo">
        {historyData.listingHistory.length ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>DOM</Th><Th>Change Type</Th><Th>Price</Th><Th>Change</Th><Th>When Changed</Th><Th>Eff Date</Th><Th>Modified By</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyData.listingHistory.map((h, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                      <Td>{h.dom}</Td>
                      <Td className="text-blue-700 font-semibold">{h.changeType}</Td>
                      <Td className="font-semibold">{h.price}</Td>
                      <Td>{h.changeDetails}</Td>
                      <Td>{h.whenChanged}</Td>
                      <Td>{h.effDate}</Td>
                      <Td className="text-blue-700 font-semibold">{h.modBy}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyData.listingHistory[0] && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                <img
                  src={historyData.listingHistory[0].imageUrl || '/fallback-property.jpg'}
                  alt="Primary"
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={e => { e.target.src = '/fallback-property.jpg'; }}
                />
                <div className="text-sm">
                  <p className="font-semibold">{historyData.listingHistory[0].listingId} • {historyData.listingHistory[0].propType}</p>
                  <p className="text-gray-600">{historyData.listingHistory[0].address}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No listing history available.</p>
        )}
      </Section>

      {/* Sale History */}
      <Section title="Sale History" tone="emerald">
        {historyData.saleHistory.length ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr><Th>Recorded</Th><Th>Sale Date</Th><Th>Sale Price</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyData.saleHistory.map((s, i) => (
                  <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                    <Td>{s.recDate}</Td>
                    <Td>{s.saleDate}</Td>
                    <Td className="font-medium">{s.salePrice}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No sale history available.</p>
        )}
      </Section>
    </div>
  );
};

export const NeighborhoodCommunity = ({ context }) => {
  if (!context) return null;
  const {
    subdivision,
    communityFeatures = [],
    associationAmenities = [],
    lotFeatures = [],
    areaFacts = [],
    utilitiesFacts = [],
    lotFacts = [],
    hoa = {},
  } = context;
  
  console.log('🏘️ Neighborhood Tab - Full context:', context);
  console.log('🏘️ Neighborhood Tab - HOA object:', hoa);
  
  const hoaLines = formatHoaAssociations(hoa);
  const hoaAmenities = hoa?.amenities?.length ? hoa.amenities : associationAmenities;
  const showHoaCard = hoa?.hasHoa && (hoaLines.length || hoaAmenities.length || hoa.hasHoa);
  
  console.log('🏘️ Neighborhood Tab - hoaLines:', hoaLines);
  console.log('🏘️ Neighborhood Tab - showHoaCard:', showHoaCard);
  const hasNeighborhood = subdivision || communityFeatures.length || hoaAmenities.length || lotFeatures.length || areaFacts.length || utilitiesFacts.length || lotFacts.length || showHoaCard;
  if (!hasNeighborhood) {
    return <p className="text-sm text-gray-500">No neighborhood or community details available.</p>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Neighborhood & Community</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subdivision && <InfoCard title="Subdivision" items={[subdivision]} accent="from-blue-500 to-indigo-500" />}
        {!!communityFeatures.length && <InfoCard title="Community Features" items={communityFeatures} accent="from-cyan-500 to-blue-500" />}
        {showHoaCard && <InfoCard title="Homeowners Association" items={hoaLines} accent="from-lime-500 to-green-500" />}
        {!!hoaAmenities.length && <InfoCard title="Association Amenities" items={hoaAmenities} accent="from-fuchsia-500 to-purple-500" />}
        {!!lotFeatures.length && <InfoCard title="Lot Features" items={lotFeatures} accent="from-emerald-500 to-teal-500" />}
        {!!areaFacts.length && <InfoCard title="Area & Zoning" items={areaFacts} accent="from-amber-500 to-orange-500" />}
        {!!utilitiesFacts.length && <InfoCard title="Utilities" items={utilitiesFacts} accent="from-slate-500 to-gray-600" />}
        {!!lotFacts.length && <InfoCard title="Lot Details" items={lotFacts} accent="from-rose-500 to-pink-500" />}
      </div>
    </div>
  );
};

export const SchoolsEducation = ({ context }) => {
  if (!context || !context.schools) return null;
  const { district, elementary, middle, high } = context.schools || {};
  const hasSchools = Boolean(district || elementary || middle || high);
  if (!hasSchools) {
    return <p className="text-sm text-gray-500">No school information available.</p>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Schools & Education</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {district && <SchoolPill label="District" value={district} />}
        {elementary && <SchoolPill label="Elementary" value={elementary} />}
        {middle && <SchoolPill label="Middle" value={middle} />}
        {high && <SchoolPill label="High" value={high} />}
      </div>
    </div>
  );
};

export const BuyerFinancingInfo = ({ property }) => {
  if (!property) return null;
  
  const financing = property.BuyerFinancing;
  const financingList = Array.isArray(financing) 
    ? financing 
    : financing 
      ? String(financing).split(/[,;]+/).map(s => s.trim()).filter(Boolean)
      : [];
  
  const hasFinancing = financingList.length > 0;
  
  // Concessions data
  const hasConcessions = property.Concessions && property.Concessions !== 'No';
  const concessionFields = [
    { label: 'Buyer Broker Fee', value: property.ConcessionsBuyerBrokerFee },
    { label: 'Closing Costs', value: property.ConcessionsClosingCosts },
    { label: 'Financing Costs', value: property.ConcessionsFinancingCosts },
    { label: 'Property Improvement Costs', value: property.ConcessionsPropertyImprovementCosts },
    { label: 'Other Costs', value: property.ConcessionsOtherCosts },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');
  
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === '') return null;
    const num = Number(amount);
    if (!Number.isFinite(num)) return amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };
  
  return (
    <div className="space-y-10">
      <Section title="Buyer Financing" tone="slate">
        {hasFinancing ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              The following financing method(s) were used to purchase this property:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {financingList.map((method, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-600"></div>
                  <span className="text-sm font-medium text-gray-900">{method}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No financing information available for this property.</p>
        )}
      </Section>

      <Section title="Concessions" tone="amber">
        {hasConcessions ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {property.Concessions && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Concessions Included</p>
                  <p className="text-sm font-semibold text-gray-900">{property.Concessions}</p>
                </div>
              )}
              {property.ConcessionsAmount !== undefined && property.ConcessionsAmount !== null && property.ConcessionsAmount !== '' && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Concessions Amount</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(property.ConcessionsAmount)}</p>
                </div>
              )}
              {property.ConcessionInPrice !== undefined && property.ConcessionInPrice !== null && property.ConcessionInPrice !== '' && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Concession in Price</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(property.ConcessionInPrice)}
                    {property.ConcessionInPriceType && ` (${property.ConcessionInPriceType})`}
                  </p>
                </div>
              )}
            </div>

            {/* Breakdown */}
            {concessionFields.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Concessions Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {concessionFields.map((field, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-xs text-gray-700">{field.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(field.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {property.ConcessionsComments && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Comments</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{property.ConcessionsComments}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {property.Concessions === 'No' 
              ? 'No concessions were included in the sale of this property.'
              : 'No concessions information available for this property.'}
          </p>
        )}
      </Section>
    </div>
  );
};

// helpers shared by all sections
function InfoCard({ title, items, accent }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${accent}`}></div>
      <div className="p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-900">{title}</h4>
        <ul className="space-y-1 text-xs text-gray-700 max-h-40 overflow-auto pr-1">
          {items.slice(0, 20).map((i, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500"></span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SchoolPill({ label, value }) {
  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition"></div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}

const toneStyles = {
  indigo: {
    bar: 'bg-indigo-500',
    label: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  emerald: {
    bar: 'bg-emerald-500',
    label: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  amber: {
    bar: 'bg-amber-500',
    label: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  slate: {
    bar: 'bg-slate-500',
    label: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

function Section({ title, children, tone = 'indigo' }) {
  const styles = toneStyles[tone] || toneStyles.indigo;
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
function Grid3({ items }) {
  const formatValue = (value) => {
    if (value === undefined || value === null || value === '' || value === 'Unknown') return 'Not available';
    return value;
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map(([label, value], i) => (
        <div key={i} className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`text-sm font-semibold ${formatValue(value) === 'Not available' ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
function Th({ children }) { return <th className="px-4 py-2 text-left font-semibold text-gray-700">{children}</th>; }
function Td({ children, className = '' }) { return <td className={`px-4 py-2 text-gray-800 ${className}`}>{children}</td>; }
function Row({ label, values, alt }) {
  return (
    <tr className={alt ? 'bg-gray-50' : ''}>
      <Td className="font-medium">{label}</Td>
      {values.map((v,i)=><Td key={i}>{v}</Td>)}
    </tr>
  );
}

function formatHoaAssociations(hoa) {
  if (!hoa || !hoa.hasHoa) {
    console.log('🏘️ formatHoaAssociations - No HOA or hasHoa is false:', hoa);
    return [];
  }
  const associations = hoa.associations || [];
  console.log('🏘️ formatHoaAssociations - Processing associations:', associations);
  
  const lines = associations.map((assoc, idx) => {
    const parts = [];
    if (assoc.name) parts.push(assoc.name);
    if (assoc.phone) parts.push(`Phone: ${assoc.phone}`);
    const feeText = formatHoaFee(assoc.fee, assoc.feeFrequency);
    console.log(`🏘️ formatHoaAssociations - Association ${idx} fee:`, assoc.fee, 'frequency:', assoc.feeFrequency, 'formatted:', feeText);
    if (feeText) parts.push(`Fee: ${feeText}`);
    if (assoc.feeIncludes?.length) parts.push(`Fee includes: ${assoc.feeIncludes.join(', ')}`);
    if (!parts.length) return null;
    const label = idx === 0 ? 'Primary HOA' : `HOA ${idx + 1}`;
    const line = `${label} • ${parts.join(' • ')}`;
    console.log(`🏘️ formatHoaAssociations - Association ${idx} formatted line:`, line);
    return line;
  }).filter(Boolean);

  if (!lines.length) {
    return ['Association present, details not provided'];
  }
  return lines;
}

function formatHoaFee(fee, frequency) {
  if (fee === undefined || fee === null || fee === '') return null;
  const numeric = Number(fee);
  const amount = Number.isFinite(numeric)
    ? `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : fee;
  return frequency ? `${amount} (${frequency})` : amount;
}

TaxInformation.propTypes = { taxData: PropTypes.object };
HistoryInformation.propTypes = { historyData: PropTypes.object };
NeighborhoodCommunity.propTypes = { context: PropTypes.object };
SchoolsEducation.propTypes = { context: PropTypes.object };
BuyerFinancingInfo.propTypes = { property: PropTypes.object };
