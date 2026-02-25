import { useState, useEffect } from 'react';
import { getLikedPropertiesWithData, getConnectionPropertiesWithData } from '../../utils/swipeUtils';
import { useAuth } from '../../context/auth-context';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faPhone } from '@fortawesome/free-solid-svg-icons';

// Create PropertyCollection component inline since it's not imported
const PropertyCollection = ({ properties, title, icon, emptyMessage, onPropertyClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!properties || properties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <FontAwesomeIcon icon={icon} className="text-4xl text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const currentProperty = properties[currentIndex];

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-teal-50 to-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={icon} className="text-2xl text-teal-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600">{properties.length} properties</p>
            </div>
          </div>
          
          {properties.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length)}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                ←
              </button>
              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {currentIndex + 1} of {properties.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % properties.length)}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="cursor-pointer" onClick={() => onPropertyClick && onPropertyClick(currentProperty)}>
          <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 overflow-hidden">
              <img
                src={currentProperty.media || '/properties.jpg'}
                alt={currentProperty.UnparsedAddress || 'Property'}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg">
                <p className="text-lg font-bold">{formatPrice(currentProperty.ListPrice)}</p>
              </div>
            </div>

            <div className="p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {currentProperty.UnparsedAddress || 'Address not available'}
              </h4>
              <p className="text-gray-700 text-sm line-clamp-2">
                {currentProperty.PublicRemarks || 'No description available.'}
              </p>
            </div>
          </div>
        </div>

        {properties.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {properties.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileView = ({ profile }) => {
  const { user } = useAuth();
  const [likedProperties, setLikedProperties] = useState([]);
  const [connectionProperties, setConnectionProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {

        const [liked, connections] = await Promise.all([
          getLikedPropertiesWithData(user.id),
          getConnectionPropertiesWithData(user.id)
        ]);




        setLikedProperties(liked || []);
        setConnectionProperties(connections || []);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [user?.id]);

  const handlePropertyClick = (property) => {

    // You can implement modal or navigation here
  };

  if (!profile) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Loading profile information...</p>
      </div>
    );
  }

  const {
    profile_picture_url,
    first_name,
    last_name,
    email,
    alternate_email,
    phone,
    city,
    state,
    zip_code,
    roles,
    interests,
    bio,
  } = profile;

  // Ensure roles and interests are arrays
  const safeRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
  const safeInterests = Array.isArray(interests) ? interests : (interests ? [interests] : []);

  const [imageError, setImageError] = useState(false);
  
  // Use same profile picture logic as dashboard
  let profileImage = '/default-avatar.png';
  if (!imageError) {
    if (profile_picture_url) {
      profileImage = profile_picture_url;
    } else if (user?.user_metadata?.avatar_url) {
      // Use avatar from OAuth provider (Google/Facebook) if no profile picture is set
      profileImage = user.user_metadata.avatar_url;
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing Profile Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={profileImage}
                alt={`${first_name || ''} ${last_name || ''}`}
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {

                  setImageError(true);
                  e.target.src = '/default-avatar.png';
                }}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {[first_name, last_name].filter(Boolean).join(' ') || 'Anonymous User'}
              </h2>
              {email && <p className="text-gray-600">{email}</p>}
              {alternate_email && (
                <p className="text-gray-500 text-sm">Alt: {alternate_email}</p>
              )}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
              <div className="mt-2 space-y-1">
                {phone && <p className="text-sm text-gray-900">Phone: {phone}</p>}
                {(city || state || zip_code) && (
                  <p className="text-sm text-gray-900">
                    Location: {[city, state, zip_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            
            {/* Roles Section */}
            {safeRoles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Roles</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {safeRoles.map((role, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded-full">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bio Section */}
          {bio && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
              <p className="text-gray-700">{bio}</p>
            </div>
          )}

          {/* Interests Section */}
          {safeInterests.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {safeInterests.map((interest, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Collections - Only for authenticated users */}
      {user?.id && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Property Collections</h2>
            <p className="text-gray-600">Properties you've saved while browsing</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your properties...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PropertyCollection
                properties={likedProperties}
                title="Liked Properties"
                icon={faHeart}
                emptyMessage="No liked properties yet. Start swiping to save your favorites!"
                onPropertyClick={handlePropertyClick}
              />
              
              <PropertyCollection
                properties={connectionProperties}
                title="Connection Requests"
                icon={faPhone}
                emptyMessage="No connection requests yet. Swipe up on properties to connect with agents!"
                onPropertyClick={handlePropertyClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileView;
