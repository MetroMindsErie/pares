// /components/SoldProperty.js
import React from 'react';

export default function SoldProperty({ data }) {
  // Determine the primary image URL:
  const imageUrl =
    data.media ||
    (data.Media && data.Media.length > 0 ? data.Media[0].MediaURL : '/fallback-property-image.jpg');

  return (
    <div className="property-card sold">
      <div className="property-header">
        <div>
          <h1>{data.UnparsedAddress}</h1>
          <h2>
            {data.USPSCity}, {data.PostalCode}
          </h2>
        </div>
        <div className="status-badge sold-badge">SOLD</div>
      </div>

      <div className="property-details-grid">
        <div className="detail-group">
          <h3>Transaction Details</h3>
          <p><strong>Sold Price:</strong> ${data.ClosePrice?.toLocaleString()}</p>
          <p><strong>Closed Date:</strong> {new Date(data.CloseDate).toLocaleDateString()}</p>
          <p><strong>Days on Market:</strong> {data.DaysOnMarket}</p>
        </div>

        <div className="detail-group">
          <h3>Property Features</h3>
          <p>• {data.LivingAreaSqFt} SqFt</p>
          <p>• {data.LotSizeAcres} Acre Lot</p>
          <p>• {data.BedroomsTotal} Bed / {data.BathroomsTotalInteger} Bath</p>
          <p>• Built in {data.YearBuilt}</p>
        </div>

        <div className="detail-group">
          <h3>Financial Details</h3>
          <p><strong>Assessed Value:</strong> ${data.TaxAssessedValue?.toLocaleString()}</p>
          <p><strong>Taxes:</strong> ${data.TaxAnnualAmount?.toLocaleString()}/year</p>
          <p><strong>Price per SqFt:</strong> {data.LivingAreaSqFt ? `$${(data.ClosePrice / data.LivingAreaSqFt).toFixed(2)}` : 'N/A'}</p>
        </div>
      </div>

      <div className="financial-highlight">
        <div>
          <h4>Buyer Agent</h4>
          <p>{data.BuyerAgentFullName}</p>
          <p>{data.BuyerOfficeName}</p>
        </div>
        <div>
          <h4>Sale Terms</h4>
          <p>{data.FinancingType}</p>
          <p>{data.Concessions ? 'With Concessions' : 'No Concessions'}</p>
        </div>
        <div>
          <h4>Closing Details</h4>
          <p>Closed {new Date(data.CloseDate).toLocaleDateString()}</p>
          <p>Transfer Taxes: {data.TransferTax}</p>
        </div>
      </div>

      <div className="agent-section">
        <h3>Listing Agent</h3>
        <p>{data.ListAgentFullName}</p>
        <p>{data.ListOfficeName}</p>
        <p>{data.ListAgentPhone}</p>
      </div>

      {data.media && data.media.length > 0 && (
        <div className="property-media-scroll">
          {data.media.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${data.UnparsedAddress} - ${index + 1}`}
              className="property-image-scroll"
            />
          ))}
        </div>
      )}
    </div>
  );
}
