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
  
  const hoaLines = formatHoaAssociations(hoa);
  const hoaAmenities = hoa?.amenities?.length ? hoa.amenities : associationAmenities;
  const showHoaCard = hoa?.hasHoa && (hoaLines.length || hoaAmenities.length || hoa.hasHoa);
  
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
  const { district, elementary, middle, high, elementaryDistrict, middleDistrict, highDistrict } = context.schools || {};
  
  const hasSchools = Boolean(district || elementary || middle || high);
  const hasSchoolNames = Boolean(elementary || middle || high);
  const hasOnlyDistricts = !hasSchoolNames && Boolean(district || elementaryDistrict || middleDistrict || highDistrict);
  
  if (!hasSchools && !hasOnlyDistricts) {
    return <p className="text-sm text-gray-500">No school information available.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Schools & Education</h3>
        <p className="text-sm text-gray-600">Information about local schools serving this area</p>
      </div>

      {/* If only districts available, show prominent district cards */}
      {hasOnlyDistricts && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">School District</p>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{district}</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                This property is served by the {district} school district. Contact the district office for specific school assignments based on your address.
              </p>
            </div>
          </div>
          
          {/* District breakdown if we have individual level districts */}
          {(elementaryDistrict || middleDistrict || highDistrict) && (
            <div className="mt-6 pt-6 border-t border-blue-200">
              <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-3">District Breakdown</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {elementaryDistrict && (
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-gray-600">Elementary</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{elementaryDistrict}</p>
                    <p className="text-xs text-gray-600 mt-1">Grades K-5</p>
                  </div>
                )}
                {middleDistrict && (
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-gray-600">Middle</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{middleDistrict}</p>
                    <p className="text-xs text-gray-600 mt-1">Grades 6-8</p>
                  </div>
                )}
                {highDistrict && (
                  <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-gray-600">High School</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{highDistrict}</p>
                    <p className="text-xs text-gray-600 mt-1">Grades 9-12</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* School District Card - only show if we also have school names */}
      {!hasOnlyDistricts && district && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold">School District</p>
              <h4 className="text-lg font-bold text-gray-900">{district}</h4>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-700">This property is served by the {district} school district.</p>
          </div>
        </div>
      )}

      {/* School Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {elementary && (
          <div className="group relative bg-white border-2 border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-bl-full"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4 group-hover:bg-emerald-200 transition-colors">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-1">Elementary School</p>
                <h5 className="text-base font-bold text-gray-900 mb-2">{elementary}</h5>
                {elementaryDistrict && (
                  <p className="text-xs text-gray-600 mb-2 italic">{elementaryDistrict}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Grades K-5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {middle && (
          <div className="group relative bg-white border-2 border-amber-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-bl-full"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-4 group-hover:bg-amber-200 transition-colors">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-600 font-semibold mb-1">Middle School</p>
                <h5 className="text-base font-bold text-gray-900 mb-2">{middle}</h5>
                {middleDistrict && (
                  <p className="text-xs text-gray-600 mb-2 italic">{middleDistrict}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Grades 6-8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {high && (
          <div className="group relative bg-white border-2 border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-bl-full"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mb-4 group-hover:bg-purple-200 transition-colors">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-600 font-semibold mb-1">High School</p>
                <h5 className="text-base font-bold text-gray-900 mb-2">{high}</h5>
                {highDistrict && (
                  <p className="text-xs text-gray-600 mb-2 italic">{highDistrict}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Grades 9-12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Information Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">School Assignment Notice</p>
            <p>School assignments are subject to change. Please verify current school boundaries and availability with the respective school district before making decisions based on this information.</p>
          </div>
        </div>
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
    return [];
  }
  const associations = hoa.associations || [];
  
  const lines = associations.map((assoc, idx) => {
    const parts = [];
    if (assoc.name) parts.push(assoc.name);
    if (assoc.phone) parts.push(`Phone: ${assoc.phone}`);
    const feeText = formatHoaFee(assoc.fee, assoc.feeFrequency);
    if (feeText) parts.push(`Fee: ${feeText}`);
    if (assoc.feeIncludes?.length) parts.push(`Fee includes: ${assoc.feeIncludes.join(', ')}`);
    if (!parts.length) return null;
    const label = idx === 0 ? 'Primary HOA' : `HOA ${idx + 1}`;
    const line = `${label} • ${parts.join(' • ')}`;
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
