const PageTitle = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--color-textSecondary)]">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

export default PageTitle
