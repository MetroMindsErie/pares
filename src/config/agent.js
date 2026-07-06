/**
 * Single source of truth for John's public contact/branding info and site URLs.
 * Every component/page should import from here — never hard-code these again.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pares.homes';
export const SITE_NAME = 'pares.homes';

export const AGENT = {
  name: 'John D. Easter',
  shortName: 'John Easter',
  firstName: 'John',
  title: 'Realtor',
  agency: 'Pennington Lines',
  agencyPhone: '814-833-3310',
  phone: '814-873-5810',
  email: 'easterjo106@yahoo.com',
  photo: '/john-easter.jpg',
  facebook: 'https://facebook.com/JohnEasterRealEstate',
  profileUrl: '/agents/john-easter',
  areaServed: ['Erie County PA', 'Warren County PA', 'Crawford County PA'],
  bio: `John Easter is a dedicated Realtor at Pennington Lines in Erie PA., specializing in residential real estate and serving homeowners with a people-first approach. Combining sharp market knowledge with honest guidance, John helps clients navigate every step of buying, selling, or preparing a home with clarity and confidence. He also assists institutions selling off asset portfolios, coordinating smooth transactions and strategic disposition plans. A dependable friend as well as an advisor, he listens closely, offers practical solutions, and celebrates each client’s milestones as if they were his own. Whether working with first-time buyers, homeowners planning next steps, institutions, or seasoned investors, clients trust John to deliver results with integrity and heart.`,
  specialties: ['Residential Real Estate', 'First-Time Buyers', 'Institutional Asset Portfolios', 'Investment Properties'],
};

/** schema.org RealEstateAgent JSON-LD for John — render on the agent page (U1). */
export function agentJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: AGENT.name,
    alternateName: AGENT.shortName,
    jobTitle: AGENT.title,
    worksFor: { '@type': 'RealEstateAgent', name: AGENT.agency, telephone: AGENT.agencyPhone },
    telephone: AGENT.phone,
    email: AGENT.email,
    image: `${SITE_URL}${AGENT.photo}`,
    url: `${SITE_URL}${AGENT.profileUrl}`,
    sameAs: [AGENT.facebook],
    areaServed: AGENT.areaServed,
    description: AGENT.bio,
  };
}
