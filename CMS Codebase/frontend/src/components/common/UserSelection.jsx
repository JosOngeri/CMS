import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Filter, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const UserSelection = ({ 
  selectedUsers = [], 
  onSelectionChange, 
  departmentId = null,
  multiple = true,
  showDepartmentFilter = true,
  className = ''
}) => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    fetchUsers();
  }, [departmentId, selectedDepartment]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = '/users';
      const params = new URLSearchParams();
      
      if (selectedDepartment !== 'all') {
        params.append('department_id', selectedDepartment);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const toggleUser = (user) => {
    let newSelection;
    
    if (multiple) {
      if (selectedUsers.find(u => u.id === user.id)) {
        newSelection = selectedUsers.filter(u => u.id !== user.id);
      } else {
        newSelection = [...selectedUsers, user];
      }
    } else {
      newSelection = [user];
    }
    
    onSelectionChange(newSelection);
    setShowDropdown(false);
  };

  const removeUser = (userId) => {
    const newSelection = selectedUsers.filter(u => u.id !== userId);
    onSelectionChange(newSelection);
  };

  const departments = [
    { id: 'all', name: 'All Departments' },
    { id: 1, name: 'Ministry' },
    { id: 2, name: 'Treasury' },
    { id: 3, name: 'Education' },
    { id: 4, name: 'Music' },
    { id: 5, name: 'Ushers' }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700 rounded-full"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
              <button
                onClick={() => removeUser(user.id)}
                className="text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-800"
                aria-label={`Remove ${user.first_name} ${user.last_name}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search and Select */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          {showDepartmentFilter && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
              aria-label="Filter by department"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}
          <div className="relative flex-1">
            <div className="flex items-center border border-[var(--color-border)] rounded-lg focus-within focus:ring-2 focus:ring-[var(--color-primary)]-500">
              <Search className="h-5 w-5 text-[var(--color-textSecondary)] ml-3" aria-hidden="true" />
              <input
                type="text"
                placeholder={multiple ? "Search users to add..." : "Search user..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="flex-1 px-3 py-2 focus:outline-none"
                aria-label="Search users"
              />
              {selectedUsers.length > 0 && (
                <button
                  onClick={() => onSelectionChange([])}
                  className="px-3 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  aria-label="Clear selection"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[var(--color-textSecondary)]">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-[var(--color-textSecondary)]">No users found</div>
            ) : (
              <div className="py-1">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-surface)] cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)]-500 to-violet-500 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-[var(--color-textSecondary)]">
                        {user.email}
                      </div>
                    </div>
                    {selectedUsers.find(u => u.id === user.id) && (
                      <div className="text-[var(--color-primary)]-600">
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelection;
