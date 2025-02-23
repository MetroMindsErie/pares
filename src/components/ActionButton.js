import PropTypes from 'prop-types';

export const ActionButton = ({ children, variant = 'primary', ...props }) => (
  <button
    className={`w-full py-3 rounded-lg transition ${
      variant === 'primary'
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
    }`}
    {...props}
  >
    {children}
  </button>
);

ActionButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary'])
};