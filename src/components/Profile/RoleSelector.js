const RoleSelector = ({ selectedRoles, onChange, onNext, onBack }) => {
  const availableRoles = [
    { id: 'developer', title: 'Developer', description: 'Software development and coding' },
    { id: 'designer', title: 'Designer', description: 'UI/UX and graphic design' },
    { id: 'manager', title: 'Manager', description: 'Project and team management' },
    { id: 'analyst', title: 'Analyst', description: 'Data analysis and insights' },
    { id: 'researcher', title: 'Researcher', description: 'AI/ML research and development' }
  ];

  const handleRoleToggle = (roleId) => {
    const updatedRoles = selectedRoles.includes(roleId)
      ? selectedRoles.filter(r => r !== roleId)
      : [...selectedRoles, roleId];
    onChange(updatedRoles);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Select Your Roles</h3>
        <div className="space-y-2">
          {availableRoles.map(role => (
            <div
              key={role.id}
              className={`p-4 border rounded-lg cursor-pointer ${
                selectedRoles.includes(role.id) ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
              }`}
              onClick={() => handleRoleToggle(role.id)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <div>
                  <p className="font-medium">{role.title}</p>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
              </div>
            </div>
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
          onClick={onNext}
          disabled={selectedRoles.length === 0}
          className="ml-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;
