import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, change }) => {
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
        {Icon && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <Icon className="h-6 w-6 text-primary-500" />
          </div>
        )}
      </div>
      
      {change && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`mt-2 text-sm flex items-center ${
            change > 0 ? 'text-success-500' : 'text-error-500'
          }`}
        >
          {change > 0 ? '↑' : '↓'}
          <span className="ml-1">{Math.abs(change)}% from last month</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StatsCard;
