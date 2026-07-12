import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Minus, CreditCard, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-toastify'

const Payments = () => {
  const { api } = useAuth()
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [pledges, setPledges] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [showPledges, setShowPledges] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [paymentItems, setPaymentItems] = useState([
    { category_id: '', amount: '', category_name: '' }
  ])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm()

  const phoneNumber = watch('phone_number')

  useEffect(() => {
    fetchCategories()
    fetchPaymentMethods()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await api.get('/payments/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Failed to load payment categories')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payments/methods')
      setPaymentMethods(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    }
  }

  const fetchPledges = async () => {
    try {
      const response = await api.get('/payments/pledges')
      setPledges(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch pledges:', error)
      toast.error('Failed to load pledges')
    }
  }

  const fetchPaymentAnalytics = async () => {
    try {
      const response = await api.get('/payments/analytics')
      setAnalytics(response.data.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    }
  }

  const fetchPaymentTrends = async () => {
    try {
      const response = await api.get('/payments/trends', {
        params: { months: 12 }
      })
      setTrends(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch trends:', error)
      toast.error('Failed to load trends')
    }
  }

  const handleVerifyPayment = async (paymentId) => {
    try {
      await api.post(`/payments/${paymentId}/verify`)
      toast.success('Payment verified successfully')
      // Refresh data
    } catch (error) {
      console.error('Failed to verify payment:', error)
      toast.error('Failed to verify payment')
    }
  }

  const handleCancelPayment = async (paymentId) => {
    if (confirm('Are you sure you want to cancel this payment?')) {
      try {
        await api.post(`/payments/${paymentId}/cancel`)
        toast.success('Payment cancelled successfully')
        // Refresh data
      } catch (error) {
        console.error('Failed to cancel payment:', error)
        toast.error('Failed to cancel payment')
      }
    }
  }

  const handleCreatePledge = async (pledgeData) => {
    try {
      await api.post('/payments/pledges', pledgeData)
      toast.success('Pledge created successfully')
      fetchPledges()
    } catch (error) {
      console.error('Failed to create pledge:', error)
      toast.error('Failed to create pledge')
    }
  }

  const handleUpdatePledge = async (pledgeId, data) => {
    try {
      await api.put(`/payments/pledges/${pledgeId}`, data)
      toast.success('Pledge updated successfully')
      fetchPledges()
    } catch (error) {
      console.error('Failed to update pledge:', error)
      toast.error('Failed to update pledge')
    }
  }

  const handleDeletePledge = async (pledgeId) => {
    if (confirm('Are you sure you want to delete this pledge?')) {
      try {
        await api.delete(`/payments/pledges/${pledgeId}`)
        toast.success('Pledge deleted successfully')
        fetchPledges()
      } catch (error) {
        console.error('Failed to delete pledge:', error)
        toast.error('Failed to delete pledge')
      }
    }
  }

  const addPaymentItem = () => {
    setPaymentItems([...paymentItems, { category_id: '', amount: '', category_name: '' }])
  }

  const removePaymentItem = (index) => {
    if (paymentItems.length > 1) {
      const newItems = paymentItems.filter((_, i) => i !== index)
      setPaymentItems(newItems)
    }
  }

  const updatePaymentItem = (index, field, value) => {
    const newItems = [...paymentItems]
    if (field === 'category_id') {
      const category = categories.find(cat => cat.id === value)
      newItems[index][field] = value
      newItems[index]['category_name'] = category ? category.name : ''
    } else {
      newItems[index][field] = value
    }
    setPaymentItems(newItems)
  }

  const calculateTotal = () => {
    return paymentItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)
  }

  const onSubmit = async (data) => {
    // Validate payment items
    const validItems = paymentItems.filter(item => 
      item.category_id && item.amount && parseFloat(item.amount) > 0
    )

    if (validItems.length === 0) {
      toast.error('Please add at least one valid payment item')
      return
    }

    try {
      setPaymentLoading(true)
      
      const paymentData = {
        phone_number: data.phone_number,
        payment_items: validItems,
        notes: data.notes
      }

      const response = await api.post('/payments', paymentData)
      
      toast.success('Payment initiated successfully! Please check your phone for M-Pesa prompt.')
      
      // Reset form
      setPaymentItems([{ category_id: '', amount: '', category_name: '' }])
      setValue('phone_number', '')
      setValue('notes', '')
      
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] text-white mb-2">
          Make Payment
        </h1>
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
          Pay your tithe, offerings, and other contributions securely via M-Pesa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                M-Pesa Phone Number *
              </label>
              <input
                {...register('phone_number', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\d\s\-\+\(\)]+$/,
                    message: 'Invalid phone number format'
                  }
                })}
                type="tel"
                className="input w-full"
                placeholder="+254 700 000 000"
              />
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Payment Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)]">
                  Payment Items *
                </label>
                <button
                  type="button"
                  onClick={addPaymentItem}
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {paymentItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
                    <div className="flex-1">
                      <select
                        value={item.category_id}
                        onChange={(e) => updatePaymentItem(index, 'category_id', e.target.value)}
                        className="input w-full mb-2"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updatePaymentItem(index, 'amount', e.target.value)}
                        className="input w-full"
                        placeholder="Amount"
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>

                    {paymentItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 hover:bg-red-900/20 rounded-lg"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input w-full"
                placeholder="Any additional notes about your payment..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-[var(--color-text)] text-white">
                Total: KES {(calculateTotal() ?? 0).toLocaleString()}
              </div>
              
              <button
                type="submit"
                disabled={paymentLoading || calculateTotal() === 0}
                className="btn btn-primary btn-lg flex items-center space-x-2"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with M-Pesa</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-[var(--color-text)] text-white mb-4">Payment Summary</h3>
            
            <div className="space-y-3">
              {paymentItems
                .filter(item => item.category_name && item.amount)
                .map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {item.category_name}
                    </span>
                    <span className="font-medium text-[var(--color-text)] text-white">
                      KES {parseFloat(item?.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              
              <div className="border-t border-[var(--color-border)] border-[var(--color-border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-[var(--color-text)] text-white">Total</span>
                  <span className="font-bold text-lg text-primary-600">
                    KES {(calculateTotal() ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-[var(--color-primary)]-50 bg-[var(--color-primary)]-900/20 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-[var(--color-primary)]-600" />
              <h3 className="font-semibold text-[var(--color-primary)]-900 text-[var(--color-primary)]-100">Secure Payment</h3>
            </div>
            
            <div className="space-y-2 text-sm text-[var(--color-primary)]-800 text-[var(--color-primary)]-200">
              <p>• All payments are processed securely via M-Pesa</p>
              <p>• You will receive an STK push on your phone</p>
              <p>• Payment confirmation will be sent automatically</p>
              <p>• Your payment history is always available</p>
            </div>
          </div>

          {/* Popular Categories */}
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-[var(--color-text)] text-white mb-4">Popular Categories</h3>
            <div className="space-y-2">
              {categories.slice(0, 5).map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                    {category.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newItem = { category_id: category.id, amount: '', category_name: category.name }
                      setPaymentItems([...paymentItems, newItem])
                    }}
                    className="text-primary-600 hover:text-primary-700 text-xs"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payments
