import { motion } from 'framer-motion';

const WelcomeBanner = ({ profile }) => {
  const profileImage = profile?.profile_picture_url || '/default-avatar.png';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-8 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold font-display">
            Welcome back, {profile?.first_name || 'User'}!
          </h1>
          <p className="mt-2 text-primary-50 opacity-90">
              "Let's explore what's new today"
          </p>
        </motion.div>
        
        {/* Profile Image */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="hidden md:block"
        >
          <img
            src={profile?.profile_picture_url || '/default-avatar.png'}
            alt="Profile"
            className="h-20 w-20 rounded-full border-4 border-white/20 shadow-xl"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WelcomeBanner;
