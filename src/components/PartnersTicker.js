import React from 'react';

/**
 * PartnersTicker
 * - renders two animated tracks of logos (duplicated for seamless marquee)
 * - accepts optional `logos` prop array of image paths
 * - place this between the navbar and hero to fill that gap
 */
const PartnersTicker = ({ logos = null }) => {
  const defaultLogos = [
    '/images/partners/partner1.png',
    '/images/partners/partner2.png',
    '/images/partners/partner3.png',
    '/images/partners/partner4.png',
    '/images/partners/partner5.jpeg',
    '/images/partners/partner6.jpg',
  ];

  const items = Array.isArray(logos) && logos.length ? logos : defaultLogos;
  // duplicate the list for a smooth loop (CSS translates -50%)
  const duplicated = [...items, ...items];

  return (
    <div className="partners-ticker" role="presentation" aria-hidden="true">
      <div className="partners-track" aria-hidden="true">
        {duplicated.map((src, i) => (
          <div key={`t1-${i}`} className="partners-logo-card">
            {/* alt intentionally empty for decorative logos; add alt text if logos are meaningful */}
            <img src={src} alt="" className="partners-logo-img" />
          </div>
        ))}
      </div>

      {/* <div className="partners-track partners-track--alt" aria-hidden="true">
        {duplicated.map((src, i) => (
          <div key={`t2-${i}`} className="partners-logo-card">
            <img src={src} alt="" className="partners-logo-img" />
          </div>
        ))}
      </div> */}
    </div>
  );
};

export default PartnersTicker;
