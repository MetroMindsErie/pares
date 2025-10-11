import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faBuilding } from '@fortawesome/free-solid-svg-icons';

const BuyerAgent = ({ className = "" }) => {
  const buyerAgent = {
    name: 'John Easter',
    email: 'easterjo106@yahoo.com',
    phone: '814-873-5810',
    agency: 'Pennington Lines',
    photo: '/dad.PNG',
    title: 'Buyer Agent'
  };

  const handleContact = (type, value) => {
    if (type === 'phone') {
      window.location.href = `tel:${value}`;
    } else if (type === 'email') {
      window.location.href = `mailto:${value}`;
    }
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-4">
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
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{buyerAgent.name}</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {buyerAgent.title}
            </span>
          </div>
          
          <div className="flex items-center text-gray-600 mb-2">
            <FontAwesomeIcon icon={faBuilding} className="w-4 h-4 mr-2" />
            <span className="text-sm">{buyerAgent.agency}</span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              onClick={() => handleContact('phone', buyerAgent.phone)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-2" />
              {buyerAgent.phone}
            </button>
            
            <button
              onClick={() => handleContact('email', buyerAgent.email)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-2" />
              {buyerAgent.email}
            </button>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <button
            onClick={() => handleContact('phone', buyerAgent.phone)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Contact Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerAgent;
