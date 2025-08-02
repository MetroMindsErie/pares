import { motion } from 'framer-motion';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faHandshake, faHeart, faUser, faHome, faPhone } from '@fortawesome/free-solid-svg-icons';

const getIcon = (iconName) => {
  const iconMap = {
    'eye': faEye,
    'handshake': faHandshake,
    'heart': faHeart,
    'user': faUser,
    'home': faHome,
    'phone': faPhone
  };
  
  return iconMap[iconName] || faUser;
};

const getPropertyDisplayImage = (property) => {
  // Always use the first image in the array
  if (property.media && Array.isArray(property.media) && property.media.length > 0) {
    return property.media[0];
  }
  if (property.media && typeof property.media === 'string') {
    return property.media;
  }
  if (property.mediaArray && Array.isArray(property.mediaArray) && property.mediaArray.length > 0) {
    return property.mediaArray[0];
  }
  return null;
};

const StatsCard = ({ title, value, change, icon }) => {
  const iconComponent = getIcon(icon);
  const isPositiveChange = change >= 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 font-display">{value}</p>
        </div>
        {icon && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <FontAwesomeIcon icon={iconComponent} className="text-primary-500 text-xl" />
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`mt-2 text-sm flex items-center ${
            isPositiveChange ? 'text-success-500' : 'text-error-500'
          }`}
        >
          {isPositiveChange ? '+' : ''}{change}%
          <span className="text-sm text-gray-500 ml-2">from last month</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StatsCard;
