import PropTypes from 'prop-types';

export const DetailItem = ({ icon, label }) => (
  <div className="flex items-center">
    <svg className="w-5 h-5 mr-2 text-teal-600">{/* Add your icon SVG here */}</svg>
    <span className="text-gray-700">{label}</span>
  </div>
);

DetailItem.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};