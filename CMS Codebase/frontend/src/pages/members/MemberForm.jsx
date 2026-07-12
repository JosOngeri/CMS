import { useState } from 'react';
import { useMembers } from '../../contexts/MembersContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Save, X, User, Mail, Phone, Calendar, MapPin, Briefcase, FileText } from 'lucide-react';
import PermissionField from '../../components/common/PermissionField';
import useFieldPermissions from '../../hooks/useFieldPermissions';

function MemberForm({ memberId, onClose }) {
  const { createMember, updateMember } = useMembers();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { permissions, canEdit, canView } = useFieldPermissions('members');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    occupation: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    baptism_date: '',
    membership_status: 'active',
    joined_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (memberId) {
        await updateMember(memberId, formData);
        toast.success('Member updated successfully');
      } else {
        await createMember(formData);
        toast.success('Member created successfully');
      }
      if (onClose) {
        onClose();
      } else {
        navigate('/dashboard/members');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to save member');
    }

    setLoading(false);
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          {memberId ? 'Edit Member' : 'Add New Member'}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PermissionField
              label="First Name *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              field="first_name"
              module="members"
              permissions={permissions}
              icon={User}
              required
            />
            <PermissionField
              label="Last Name *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              field="last_name"
              module="members"
              permissions={permissions}
              icon={User}
              required
            />
            <PermissionField
              label="Date of Birth"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              field="date_of_birth"
              module="members"
              permissions={permissions}
              icon={Calendar}
            />
            <PermissionField
              label="Gender"
              type="select"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              field="gender"
              module="members"
              permissions={permissions}
              icon={User}
            >
              <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <PermissionField
              label="Marital Status"
              type="select"
              name="marital_status"
              value={formData.marital_status}
              onChange={handleChange}
              field="marital_status"
              module="members"
              permissions={permissions}
              icon={User}
            >
              <option value="">Select Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </PermissionField>
            <PermissionField
              label="Occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              field="occupation"
              module="members"
              permissions={permissions}
              icon={Briefcase}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PermissionField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              field="email"
              module="members"
              permissions={permissions}
              icon={Mail}
            />
            <PermissionField
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              field="phone"
              module="members"
              permissions={permissions}
              icon={Phone}
            />
            <PermissionField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              field="address"
              module="members"
              permissions={permissions}
              icon={MapPin}
              className="md:col-span-2"
            />
            <PermissionField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              field="city"
              module="members"
              permissions={permissions}
              icon={MapPin}
            />
            </div>
          </div>
        </div>

        {/* Church Information */}
        <div>
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Church Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PermissionField
              label="Baptism Date"
              type="date"
              name="baptism_date"
              value={formData.baptism_date}
              onChange={handleChange}
              field="baptism_date"
              module="members"
              permissions={permissions}
              icon={Calendar}
            />
            <PermissionField
              label="Membership Status"
              type="select"
              name="membership_status"
              value={formData.membership_status}
              onChange={handleChange}
              field="membership_status"
              module="members"
              permissions={permissions}
              icon={User}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="visitor">Visitor</option>
            </PermissionField>
            <PermissionField
              label="Joined Date"
              type="date"
              name="joined_date"
              value={formData.joined_date}
              onChange={handleChange}
              field="joined_date"
              module="members"
              permissions={permissions}
              icon={Calendar}
            />
          </div>
        </div>

        {/* Notes */}
        <PermissionField
          label="Notes"
          type="textarea"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          field="notes"
          module="members"
          permissions={permissions}
          icon={FileText}
          rows={3}
          className="md:col-span-2"
        />

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose || (() => navigate('/dashboard/members'))}
            className="px-6 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-background)] min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Member
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MemberForm;
