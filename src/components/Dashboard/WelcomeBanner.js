import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const WelcomeBanner = ({ profile }) => {
  const [profileImage, setProfileImage] = useState('/default-avatar.png');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  
  // Set profile picture immediately when profile loads or changes
  useEffect(() => {
    if (!profile) return;
    

    setLoadAttempted(false);
    setImageLoaded(false);
    
    // Try multiple sources for the profile picture
    if (profile.profile_picture_url) {

      setProfileImage(profile.profile_picture_url);
    } else if (profile.avatar_url) {

      setProfileImage(profile.avatar_url);
    } else if (profile.metadata?.avatar_url) {

      setProfileImage(profile.metadata.avatar_url);
    } else {

      setProfileImage('/default-avatar.png');
      // For default image, we can consider it loaded
      setImageLoaded(true);
    }
  }, [profile]);
  
  // Handle image loading error
  const handleImageError = () => {
    console.error('Profile image failed to load:', profileImage);
    
    // If we haven't tried Facebook yet, try to construct a Facebook profile picture URL
    if (!loadAttempted && profile?.facebook_user_id) {
      setLoadAttempted(true);
      const fbPictureUrl = `https://graph.facebook.com/${profile.facebook_user_id}/picture?type=large`;

      setProfileImage(fbPictureUrl);
    } else {
      // If all attempts fail, use default
      setProfileImage('/default-avatar.png');
      setImageLoaded(true);
    }
  };
  
  // Handle successful image load
  const handleImageLoad = () => {

    setImageLoaded(true);
  };

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
        
        {/* Profile Image with loading state and error handling */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="hidden md:block"
        >
          <div className="relative h-20 w-20">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary-500 rounded-full">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <img
              src={profileImage}
              alt={`${profile?.first_name || 'User'}'s profile`}
              className={`h-20 w-20 rounded-full border-4 border-white/20 shadow-xl object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WelcomeBanner;
