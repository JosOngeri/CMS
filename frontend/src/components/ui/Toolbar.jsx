const Toolbar = ({ children, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${className}`}>
    {children}
  </div>
)

export default Toolbar
