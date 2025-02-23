import PropTypes from 'prop-types';
import { ActiveProperty } from './ActiveProperty';

export const SoldProperty = ({ property }) => (
  <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-8">
    <div className="bg-red-600 text-white px-4 py-2 rounded-t-xl">
      Sold for ${property.soldPrice.toLocaleString()} on {property.soldDate}
    </div>

    <div className="mt-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl text-gray-500 line-through">
          ${property.price.toLocaleString()}
        </span>
        <span className="text-3xl font-bold text-gray-900">
          ${property.soldPrice.toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        Closed on {property.soldDate}
      </p>
    </div>

    <ActiveProperty property={property} />
    
    <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
      <h3 className="font-medium">Sale Details</h3>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <p className="text-sm">Closing Date</p>
          <p className="font-medium">{property.soldDate}</p>
        </div>
        {property.buyerAgent && (
          <div>
            <p className="text-sm">Buyer's Agent</p>
            <p className="font-medium">{property.buyerAgent}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

SoldProperty.propTypes = {
  property: PropTypes.shape({
    ...ActiveProperty.propTypes.property,
    soldPrice: PropTypes.number.isRequired,
    soldDate: PropTypes.string.isRequired,
    buyerAgent: PropTypes.string,
  }).isRequired,
};