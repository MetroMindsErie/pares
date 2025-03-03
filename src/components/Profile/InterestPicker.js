const InterestPicker = ({ selectedInterests, onChange, onBack, onSubmit }) => {
  const interests = [
    'Programming', 'Design', 'Business', 'Marketing',
    'Data Science', 'AI', 'Mobile Development', 'Web Development'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Select Your Interests</h3>
        <div className="flex flex-wrap gap-2">
          {interests.map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => {
                const updated = selectedInterests.includes(interest)
                  ? selectedInterests.filter(i => i !== interest)
                  : [...selectedInterests, interest];
                onChange(updated);
              }}
              className={`px-4 py-2 rounded-full ${
                selectedInterests.includes(interest)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={selectedInterests.length === 0}
          className="ml-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Profile
        </button>
      </div>
    </div>
  );
};

export default InterestPicker;
