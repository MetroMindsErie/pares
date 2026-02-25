import PropTypes from 'prop-types';

export const ActionButton = ({ children, variant = 'primary', ...props }) => (
  <button
    className={`w-full py-3 rounded-lg transition ${
      variant === 'primary'
        ? 'bg-teal-600 text-white hover:bg-teal-700'
        : 'border-2 border-teal-600 text-teal-600 hover:bg-teal-50'
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