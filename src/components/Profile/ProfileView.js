import { useState } from 'react';

const ProfileView = ({ profile }) => {
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
    roles = [],
    interests = [],
    bio,
  } = profile;

  const [imageError, setImageError] = useState(false);
  const profileImage = !imageError && profile_picture_url ? profile_picture_url : '/default-avatar.png';

  return (
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
                console.log("Image failed to load, using default avatar");
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
          {roles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Roles</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((role, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
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
        {interests.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
