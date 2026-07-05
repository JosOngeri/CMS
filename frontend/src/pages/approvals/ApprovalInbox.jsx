import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation';
import PasswordConfirmationModal from '../../components/common/PasswordConfirmationModal';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';
import { CheckCircle, Clock, XCircle, FileText, Activity } from 'lucide-react';

const ApprovalInbox = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const {
    showPasswordModal,
    password,
    setPassword,
    isLoading: passwordLoading,
    requirePasswordConfirmation,
    handlePasswordConfirmation,
    cancelPasswordConfirmation
  } = usePasswordConfirmation();

  const approvalTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'history', label: 'History', icon: FileText }
  ];

  const handleRejectApproval = (approvalId) => {
    requirePasswordConfirmation(
      async () => {
        // Your rejection logic here
        await api.post(`/approvals/${approvalId}/reject`);
        toast.success('Approval rejected successfully');
      },
      'Please enter your password to confirm the rejection of this approval. This action cannot be undone.'
    );
  };

  const handleDeleteApproval = (approvalId) => {
    requirePasswordConfirmation(
      async () => {
        // Your deletion logic here
        await api.delete(`/approvals/${approvalId}`);
        toast.success('Approval deleted successfully');
      },
      'Please enter your password to confirm the deletion of this approval. This action cannot be undone.'
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
              <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Approval Overview</h3>
              <p className="text-[var(--color-textSecondary)]">Overview of approval workflows and pending requests.</p>
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
              <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Pending Approvals</h3>
              <p className="text-[var(--color-textSecondary)]">View and process pending approval requests.</p>
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
              <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Approved Requests</h3>
              <p className="text-[var(--color-textSecondary)]">View approved approval requests.</p>
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
              <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Rejected Requests</h3>
              <p className="text-[var(--color-textSecondary)]">View rejected approval requests.</p>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
              <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Approval History</h3>
              <p className="text-[var(--color-textSecondary)]">View complete approval history and audit trail.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Approval Inbox</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Manage approval workflows and requests</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={approvalTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="approvals-tab"
      />

      {/* Tab Content */}
      {renderTabContent()}
      
      {/* Password Confirmation Modal */}
      <PasswordConfirmationModal
        show={showPasswordModal}
        onClose={cancelPasswordConfirmation}
        onConfirm={handlePasswordConfirmation}
        password={password}
        setPassword={setPassword}
        isLoading={passwordLoading}
        title="Confirm Action"
      />
    </div>
  );
};

export default ApprovalInbox;
