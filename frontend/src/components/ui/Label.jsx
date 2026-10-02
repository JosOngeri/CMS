const Label = ({ htmlFor, children, required = false, className = '' }) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-[var(--color-textSecondary)] mb-2 ${className}`}
  >
    {children}
    {required && <span className="text-[var(--color-error)]"> *</span>}
  </label>
)

export default Label
