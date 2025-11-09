import React from 'react';
import PropTypes from 'prop-types';

export const TaxInformation = ({ taxData }) => {
  if (!taxData) return null;
  return (
    <div className="space-y-10">
      {/* Owner Information */}
      <Section title="Owner Information">
        <Grid3 items={[
          ['Owner Name', taxData.ownerInformation.ownerName],
          ['Mailing Address', taxData.ownerInformation.mailingAddress],
          ['Tax Billing City & State', taxData.ownerInformation.taxBillingCity],
          ['Tax Billing Zip', taxData.ownerInformation.taxBillingZip],
          ['Owner Occupied', taxData.ownerInformation.ownerOccupied]
        ]}/>
      </Section>

      {/* Location Information */}
      <Section title="Location Information">
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
      <Section title="Tax Breakdown">
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
      <Section title="Assessment & Taxes (Recent Years)">
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
      <Section title="Listing History">
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
                  <Td className="text-blue-600">{h.changeType}</Td>
                  <Td className="font-medium">{h.price}</Td>
                  <Td>{h.changeDetails}</Td>
                  <Td>{h.whenChanged}</Td>
                  <Td>{h.effDate}</Td>
                  <Td className="text-blue-600">{h.modBy}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {historyData.listingHistory[0] && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-white rounded-lg border">
            <img
              src={historyData.listingHistory[0].imageUrl || '/fallback-property.jpg'}
              alt="Primary"
              className="w-16 h-16 object-cover rounded-lg"
              onError={e => { e.target.src = '/fallback-property.jpg'; }}
            />
            <div className="text-sm">
              <p className="font-medium">{historyData.listingHistory[0].listingId} • {historyData.listingHistory[0].propType}</p>
              <p className="text-gray-600">{historyData.listingHistory[0].address}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Sale History */}
      <Section title="Sale History">
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
  const { subdivision, communityFeatures = [], associationAmenities = [], lotFeatures = [] } = context;
  const hasNeighborhood = subdivision || communityFeatures.length || associationAmenities.length || lotFeatures.length;
  if (!hasNeighborhood) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Neighborhood & Community</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subdivision && <InfoCard title="Subdivision" items={[subdivision]} accent="from-blue-500 to-indigo-500" />}
        {!!communityFeatures.length && <InfoCard title="Community Features" items={communityFeatures} accent="from-cyan-500 to-blue-500" />}
        {!!associationAmenities.length && <InfoCard title="Association Amenities" items={associationAmenities} accent="from-fuchsia-500 to-purple-500" />}
        {!!lotFeatures.length && <InfoCard title="Lot Features" items={lotFeatures} accent="from-emerald-500 to-teal-500" />}
      </div>
    </div>
  );
};

export const SchoolsEducation = ({ context }) => {
  if (!context || !context.schools) return null;
  const { district, elementary, middle, high } = context.schools || {};
  const hasSchools = Boolean(district || elementary || middle || high);
  if (!hasSchools) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Schools & Education</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {district && <SchoolPill label="District" value={district} />}
        {elementary && <SchoolPill label="Elementary" value={elementary} />}
        {middle && <SchoolPill label="Middle" value={middle} />}
        {high && <SchoolPill label="High" value={high} />}
      </div>
    </div>
  );
};

// helpers shared by all sections
function InfoCard({ title, items, accent }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${accent}`}></div>
      <div className="p-4">
        <h4 className="font-semibold text-sm mb-2 text-gray-800">{title}</h4>
        <ul className="space-y-1 text-xs text-gray-600 max-h-40 overflow-auto pr-1">
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

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
function Grid3({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map(([label, value], i) => (
        <div key={i} className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
        </div>
      ))}
    </div>
  );
}
function Th({ children }) { return <th className="px-4 py-2 text-left font-medium text-gray-600">{children}</th>; }
function Td({ children, className = '' }) { return <td className={`px-4 py-2 ${className}`}>{children}</td>; }
function Row({ label, values, alt }) {
  return (
    <tr className={alt ? 'bg-gray-50' : ''}>
      <Td className="font-medium">{label}</Td>
      {values.map((v,i)=><Td key={i}>{v}</Td>)}
    </tr>
  );
}

TaxInformation.propTypes = { taxData: PropTypes.object };
HistoryInformation.propTypes = { historyData: PropTypes.object };
NeighborhoodCommunity.propTypes = { context: PropTypes.object };
SchoolsEducation.propTypes = { context: PropTypes.object };
