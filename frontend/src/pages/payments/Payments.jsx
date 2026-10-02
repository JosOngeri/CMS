/**
 * WHAT THIS FILE DOES
 * -------------------
 * The "Give Now" form. A member picks what they are giving toward (tithe,
 * offering, a project, etc.), enters amounts for one or more items, and gets
 * an M-Pesa prompt on their phone to confirm.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/payments/categories → giving categories (tithe, offering…)
 * - backend /api/payments            → starts the M-Pesa payment
 * - AuthContext.jsx                  → provides the api client
 * - ToastContext.jsx                 → success/error popups
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Minus, CreditCard, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const Payments = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentItems, setPaymentItems] = useState([
    { category_id: '', amount: '', category_name: '' }
  ])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await api.get('/payments/categories')
      setCategories(response.data.categories || response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Failed to load giving categories')
    } finally {
      setLoading(false)
    }
  }

  const addPaymentItem = () => {
    setPaymentItems([...paymentItems, { category_id: '', amount: '', category_name: '' }])
  }

  const removePaymentItem = (index) => {
    if (paymentItems.length > 1) {
      setPaymentItems(paymentItems.filter((_, i) => i !== index))
    }
  }

  const updatePaymentItem = (index, field, value) => {
    const newItems = [...paymentItems]
    if (field === 'category_id') {
      const category = categories.find(cat => String(cat.id) === String(value))
      newItems[index].category_id = value
      newItems[index].category_name = category ? category.name : ''
    } else {
      newItems[index][field] = value
    }
    setPaymentItems(newItems)
  }

  const calculateTotal = () =>
    paymentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  const onSubmit = async (data) => {
    const validItems = paymentItems.filter(
      item => item.category_id && item.amount && parseFloat(item.amount) > 0
    )

    if (validItems.length === 0) {
      toast.error('Please add at least one giving item')
      return
    }

    try {
      setPaymentLoading(true)
      await api.post('/payments', {
        phone_number: data.phone_number,
        payment_items: validItems,
        notes: data.notes,
      })
      toast.success('M-Pesa prompt sent! Check your phone to confirm.')
      setPaymentItems([{ category_id: '', amount: '', category_name: '' }])
      setValue('phone_number', '')
      setValue('notes', '')
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.response?.data?.error || 'Could not start the payment. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          Make a Payment
        </h1>
        <p className="text-[var(--color-textSecondary)]">
          Give your tithe, offering, or contribution securely via M-Pesa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone number */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                M-Pesa Phone Number *
              </label>
              <input
                {...register('phone_number', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\d\s\-+()]+$/,
                    message: 'Invalid phone number format',
                  },
                })}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="input w-full"
                placeholder="254 700 000 000"
              />
              {errors.phone_number && (
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Giving items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)]">
                  What are you paying for? *
                </label>
                <button
                  type="button"
                  onClick={addPaymentItem}
                  className="flex items-center space-x-1 text-[var(--color-primary)] text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {paymentItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex-1">
                      <select
                        value={item.category_id}
                        onChange={(e) => updatePaymentItem(index, 'category_id', e.target.value)}
                        className="input w-full"
                        required
                      >
                        <option value="">Choose a category</option>
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
                        inputMode="decimal"
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
                        className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-lg"
                        aria-label="Remove item"
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
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Notes (optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input w-full"
                placeholder="Anything we should know about this payment?"
              />
            </div>

            {/* Total + submit */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-[var(--color-text)]">
                Total: KES {calculateTotal().toLocaleString()}
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

        {/* Summary sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Payment Summary</h3>
            <div className="space-y-3">
              {paymentItems
                .filter(item => item.category_name && item.amount)
                .map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-[var(--color-textSecondary)]">{item.category_name}</span>
                    <span className="font-medium text-[var(--color-text)]">
                      KES {parseFloat(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-[var(--color-text)]">Total</span>
                  <span className="font-bold text-lg text-[var(--color-primary)]">
                    KES {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[color-mix(in_srgb,var(--color-primary-light)_30%,transparent)] p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-[var(--color-primary)]" />
              <h3 className="font-semibold text-[var(--color-text)]">Secure Payment</h3>
            </div>
            <div className="space-y-2 text-sm text-[var(--color-textSecondary)]">
              <p>• Payments are processed securely via M-Pesa</p>
              <p>• You will get a prompt on your phone to confirm</p>
              <p>• A confirmation is sent automatically after you pay</p>
              <p>• Your payment history is always available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payments
