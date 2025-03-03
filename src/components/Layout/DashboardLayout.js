import { motion } from 'framer-motion';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 gap-8"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardLayout;
