"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faRuler, faCar, faBuilding } from '@fortawesome/free-solid-svg-icons';

/**
 * Component to display agent's listed, pending, and sold properties
 */
const AgentPropertiesSection = ({ agentName, properties = [] }) => {
  const router = useRouter();
  const [filter, setFilter] = useState('active'); // Default to active properties
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'price-high', 'price-low'
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter and sort properties
  useEffect(() => {
    let filtered = [...properties];

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(p => p.StandardStatus === 'Active');
    } else if (filter === 'pending') {
      filtered = filtered.filter(p => p.StandardStatus === 'Pending');
    } else if (filter === 'sold') {
      filtered = filtered.filter(p => p.StandardStatus === 'Closed');
    }

    // Sort
    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.ListPrice || 0) - (a.ListPrice || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.ListPrice || 0) - (b.ListPrice || 0));
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.ModificationTimestamp) - new Date(a.ModificationTimestamp));
    }

    setFilteredProperties(filtered);
  }, [properties, filter, sortBy]);

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'Closed') return 'Sold';
    return status || 'Active';
  };

  if (!properties || properties.length === 0) {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faBuilding} className="text-5xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Properties Listed</h3>
          <p className="text-gray-600">This agent doesn't have any active properties at this time.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          {agentName}'s Properties
        </h2>

        {/* Filters and Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Properties ({properties.length})</option>
              <option value="active">
                Active ({properties.filter(p => p.StandardStatus === 'Active').length})
              </option>
              <option value="pending">
                Pending ({properties.filter(p => p.StandardStatus === 'Pending').length})
              </option>
              <option value="sold">
                Sold ({properties.filter(p => p.StandardStatus === 'Closed').length})
              </option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="recent">Most Recent</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.ListingKey}
                onClick={() => router.push(`/property/${property.ListingKey}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
                  {property.media && property.media !== '/fallback-property.jpg' ? (
                    <img
                      src={property.media}
                      alt={property.UnparsedAddress || 'Property'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.src = '/fallback-property.jpg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <FontAwesomeIcon icon={faBuilding} className="text-2xl text-gray-600" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(property.StandardStatus)}`}>
                    {getStatusLabel(property.StandardStatus)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Address */}
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">
                    {property.UnparsedAddress || 'Property'}
                  </h3>

                  {/* City, State */}
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    {property.City}, {property.StateOrProvince} {property.PostalCode}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-lg sm:text-xl font-bold text-teal-600">
                      {property.StandardStatus === 'Closed'
                        ? `Sold: ${formatPrice(property.ClosePrice)}`
                        : formatPrice(property.ListPrice)}
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                    {/* Bedrooms */}
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faBed} className="text-gray-500" />
                      <span>{property.BedroomsTotal || '—'}</span>
                    </div>
                    {/* Bathrooms */}
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faBath} className="text-gray-500" />
                      <span>{property.BathroomsTotalInteger || '—'}</span>
                    </div>
                    {/* Square Feet */}
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faRuler} className="text-gray-500" />
                      <span>
                        {property.LivingArea ? `${(property.LivingArea / 1000).toFixed(1)}k` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button className="w-full px-3 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} properties found.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AgentPropertiesSection;
