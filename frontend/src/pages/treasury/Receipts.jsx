import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Search, Filter, ChevronDown, Download, RefreshCw,
  FileText, Eye, Calendar, DollarSign
} from 'lucide-react'
import Card from '../../components/common/Card'
import MobileCard, { CardField } from '../../components/common/MobileCard'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Receipts = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    fetchReceipts()
  }, [])

  useEffect(() => {
    filterReceipts()
  }, [searchTerm, filterDateFrom, filterDateTo, receipts])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/receipts')
      if (response.data) {
        setReceipts(response.data.receipts || [])
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  const filterReceipts = () => {
    let filtered = [...receipts]

    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterDateFrom) {
      filtered = filtered.filter(receipt => receipt.receipt_date >= filterDateFrom)
    }

    if (filterDateTo) {
      filtered = filtered.filter(receipt => receipt.receipt_date <= filterDateTo)
    }

    setFilteredReceipts(filtered)
  }

  const handleDownloadPDF = async (receiptId) => {
    try {
      const response = await api.get(`/treasury/receipts/${receiptId}/pdf`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `receipt-${receiptId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('Receipt downloaded successfully')
    } catch (error) {
      console.error('Failed to download receipt:', error)
      toast.error('Failed to download receipt')
    }
  }

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt)
  }

  if (loading) {
    return <FullPageLoading message="Loading receipts..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Receipts</h1>
        <p className="text-sm text-[var(--color-textSecondary)]">
          Generate and manage payment receipts
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchReceipts}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Receipts List */}
      <Card>
        {filteredReceipts.length > 0 ? (
          <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Receipt #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Member</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-[var(--color-border)]">
                    <td className="py-3 px-4 text-sm text-[var(--color-text)] font-medium">
                      {receipt.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-textSecondary)]">
                      {new Date(receipt.receipt_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text)]">
                      {receipt.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-textSecondary)]">
                      {receipt.member_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[var(--color-text)] font-semibold">
                      KES {parseFloat(receipt?.amount ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewReceipt(receipt)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(receipt.id)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:text-[var(--color-success)] transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {filteredReceipts.map((receipt) => (
              <MobileCard
                key={receipt.id}
                icon={FileText}
                title={receipt.receipt_number}
                subtitle={`${receipt.description} · ${new Date(receipt.receipt_date).toLocaleDateString()}`}
                onClick={() => handleViewReceipt(receipt)}
                actions={
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadPDF(receipt.id); }}
                    className="flex items-center gap-1 text-sm text-[var(--color-success)] font-medium min-h-[44px] px-2"
                  >
                    <Download className="h-4 w-4" /><span>Download PDF</span>
                  </button>
                }
              >
                <CardField label="Member" value={receipt.member_name || '—'} />
                <CardField label="Amount" value={`KES ${parseFloat(receipt?.amount ?? 0).toLocaleString()}`} />
              </MobileCard>
            ))}
          </div>
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title="No receipts found"
            description="No receipt records match the current filters."
          />
        )}
      </Card>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Receipt Details</h2>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 hover:bg-[var(--color-surface)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Receipt Number</p>
                    <p className="font-semibold text-[var(--color-text)]">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Date</p>
                    <p className="font-semibold text-[var(--color-text)]">
                      {new Date(selectedReceipt.receipt_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Description</p>
                  <p className="font-semibold text-[var(--color-text)]">{selectedReceipt.description}</p>
                </div>
                {selectedReceipt.member_name && (
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Member</p>
                    <p className="font-semibold text-[var(--color-text)]">{selectedReceipt.member_name}</p>
                  </div>
                )}
                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold text-[var(--color-text)]">Total</p>
                    <p className="text-2xl font-bold text-[var(--color-text)]">
                      KES {parseFloat(selectedReceipt?.amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => handleDownloadPDF(selectedReceipt.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)] transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Receipts
