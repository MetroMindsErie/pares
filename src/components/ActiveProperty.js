// /components/ActiveProperty.js
import React from 'react';

export default function ActiveProperty({ data }) {
  // Determine the primary image URL:
  const imageUrl =
    data.media ||
    (data.Media && data.Media.length > 0 ? data.Media[0].MediaURL : '/fallback-property-image.jpg');

  return (
    <div className="property-card active">
      <div className="property-header">
        <div>
          <h1>{data.UnparsedAddress}</h1>
          <h2>
            {data.USPSCity}, {data.PostalCode}
          </h2>
        </div>
        <div className="status-badge active-badge">ACTIVE LISTING</div>
      </div>

      <div className="property-details-grid">
        <div className="detail-group">
          <h3>Property Overview</h3>
          <p><strong>MLS#:</strong> {data.ListingKey}</p>
          <p><strong>List Price:</strong> ${data.ListPrice?.toLocaleString()}</p>
          <p><strong>Type:</strong> {data.PropertyType}</p>
          <p><strong>Bed/Bath:</strong> {data.BedroomsTotal} / {data.BathroomsTotalInteger}</p>
        </div>

        <div className="detail-group">
          <h3>Property Features</h3>
          <p>• {data.LivingAreaSqFt} SqFt</p>
          <p>• {data.GarageSpaces} Car Garage</p>
          <p>• {data.LotSizeAcres} Acre Lot</p>
          <p>• Built in {data.YearBuilt}</p>
        </div>

        <div className="detail-group">
          <h3>Key Details</h3>
          <p><strong>Status:</strong> {data.StandardStatus}</p>
          <p><strong>Last Updated:</strong> {new Date(data.ModificationTimestamp).toLocaleDateString()}</p>
          <p><strong>Days on Market:</strong> {data.DaysOnMarket}</p>
        </div>
      </div>

      <div className="financial-highlight">
        <div>
          <h4>Estimated Taxes</h4>
          <p>${data.TaxAnnualAmount?.toLocaleString()}/year</p>
        </div>
        <div>
          <h4>Price per SqFt</h4>
          <p>
            {data.LivingAreaSqFt ? `$${(data.ListPrice / data.LivingAreaSqFt).toFixed(2)}` : 'N/A'}
          </p>
        </div>
        <div>
          <h4>Open House</h4>
          <p>Sat/Sun 1-4PM</p>
        </div>
      </div>

      <div className="agent-section">
        <h3>Listing Agent</h3>
        <p>{data.ListAgentFullName}</p>
        <p>{data.ListOfficeName}</p>
        <p>{data.ListAgentPhone}</p>
      </div>

      {imageUrl && (
        <div className="property-media">
          <img
            src={imageUrl}
            alt={data.UnparsedAddress}
            className="property-image"
          />
        </div>
      )}
    </div>
  );
}
