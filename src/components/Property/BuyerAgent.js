import React from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faBuilding } from '@fortawesome/free-solid-svg-icons';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AGENT } from '../../config/agent';

const BuyerAgent = ({ className = "" }) => {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const onAgentPage = router.pathname === AGENT.profileUrl;
  const buyerAgent = {
    name: AGENT.shortName,
    email: AGENT.email,
    phone: AGENT.phone,
    agency: AGENT.agency,
    agencyPhone: AGENT.agencyPhone,
    photo: AGENT.photo,
    title: AGENT.title
  };

  const handleContact = (type, value) => {
    trackEvent(type === 'phone' ? 'phone_call' : 'email_click', { page: 'buyer_agent_card' });
    if (type === 'phone') {
      window.location.href = `tel:${value}`;
    } else if (type === 'email') {
      window.location.href = `mailto:${value}`;
    }
  };

  return (
    <div className={`bg-teal-50 border border-teal-200 rounded-lg p-4 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={buyerAgent.photo}
            alt={buyerAgent.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
            onError={(e) => {
              e.target.src = '/default-agent.jpg';
            }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{buyerAgent.name}</h3>
          <p className="text-sm text-gray-600 mb-1">{buyerAgent.title}</p>
          <p className="text-sm text-gray-600 mb-3">{buyerAgent.agency}</p>
          
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              onClick={() => handleContact('phone', buyerAgent.phone)}
              className="flex items-center text-sm text-teal-600 hover:text-teal-800 transition-colors"
            >
              <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-2" />
              {buyerAgent.phone}
            </button>
            
            <button
              onClick={() => handleContact('phone', buyerAgent.agencyPhone)}
              className="flex items-center text-sm text-teal-600 hover:text-teal-800 transition-colors"
            >
              <FontAwesomeIcon icon={faBuilding} className="w-4 h-4 mr-2" />
              {buyerAgent.agencyPhone}
            </button>
            
            <button
              onClick={() => handleContact('email', buyerAgent.email)}
              className="flex items-center text-sm text-teal-600 hover:text-teal-800 transition-colors"
            >
              <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-2" />
              {buyerAgent.email}
            </button>
          </div>
        </div>
        
        <div className="w-full sm:w-auto flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={() => handleContact('phone', buyerAgent.phone)}
            className="w-full sm:w-auto bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            Contact Now
          </button>
          {!onAgentPage && (
            <a
              href={`${AGENT.profileUrl}?property=${encodeURIComponent(router.asPath)}`}
              className="w-full sm:w-auto text-center border border-teal-600 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium"
            >
              Ask John about this home
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerAgent;
