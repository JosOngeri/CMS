import React, { useState } from 'react';
import { DollarSign, Calendar, Download, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const MyPayments = () => {
  const { user, api } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments/my-payments');
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      toast.loading('Downloading receipt...');
      const response = await api.get(`/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-[var(--color-textSecondary)]" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]';
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  React.useEffect(() => {
    fetchPayments();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading payments...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Payments</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">View your payment history and download receipts</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Payments</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                KES {payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                KES {payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Transactions</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-[var(--color-primary)]-600" />
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-[var(--color-surface)] rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Payment History ({filteredPayments.length})</h2>
        </div>
        <div className="p-4">
          {filteredPayments.length === 0 ? (
            <p className="text-[var(--color-textSecondary)] text-center py-8">No payments found</p>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-[var(--color-background)] bg-[var(--color-surface)] rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(payment.status)}
                      <p className="font-medium">{payment.description || 'Payment'}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                    {payment.purpose && (
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">Purpose: {payment.purpose}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">KES {payment.amount.toLocaleString()}</p>
                    {payment.status === 'completed' && (
                      <button
                        onClick={() => downloadReceipt(payment.id)}
                        className="mt-2 text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPayments;
