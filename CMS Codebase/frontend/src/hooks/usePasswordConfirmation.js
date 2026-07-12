import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

/**
 * Reusable hook for password confirmation before sensitive operations
 * @returns {Object} - password confirmation state and functions
 */
export const usePasswordConfirmation = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Request password confirmation before executing an action
   * @param {Function} action - The action to execute after password verification
   * @param {string} message - Custom message to show in the modal
   */
  const requirePasswordConfirmation = (action, message = null) => {
    setPendingAction(() => action);
    setShowPasswordModal(true);
  };

  /**
   * Verify password and execute the pending action
   */
  const handlePasswordConfirmation = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      
      // Verify password
      const response = await api.post('/auth/verify-password', { password });
      
      if (response.data.success) {
        // Password verified, execute the pending action
        if (pendingAction) {
          await pendingAction();
        }
        
        // Reset state
        setShowPasswordModal(false);
        setPassword('');
        setPendingAction(null);
      } else {
        toast.error('Invalid password. Please try again.');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast.error('Invalid password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel password confirmation
   */
  const cancelPasswordConfirmation = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPendingAction(null);
  };

  return {
    showPasswordModal,
    password,
    setPassword,
    isLoading,
    requirePasswordConfirmation,
    handlePasswordConfirmation,
    cancelPasswordConfirmation
  };
};
