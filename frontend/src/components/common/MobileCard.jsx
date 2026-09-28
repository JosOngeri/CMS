/**
 * MobileCard — Flutter ListTile-style row used to replace data tables on
 * small screens. Pair with `hidden md:block` on the desktop <table>.
 *
 *   <MobileCard icon={User} title={m.name} subtitle={m.phone}
 *               badge={<StatusChip/>} onClick={...}>
 *     <CardField label="Dept" value={m.department} />
 *   </MobileCard>
 */

export const CardField = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-[var(--color-textSecondary)]">{label}</span>
    <span className="font-medium text-[var(--color-text)] text-right">{value ?? '—'}</span>
  </div>
);

const MobileCard = ({ icon: Icon, title, subtitle, badge, children, onClick, actions }) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      className={`w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm transition-colors ${onClick ? 'cursor-pointer active:bg-[var(--color-background)]' : ''}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text)] truncate">{title}</p>
          {subtitle && (
            <p className="text-sm text-[var(--color-textSecondary)] truncate">{subtitle}</p>
          )}
        </div>
        {badge}
        {onClick && (
          <svg className="h-5 w-5 text-[var(--color-textTertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {children && <div className="mt-3 space-y-1.5 pt-3 border-t border-[var(--color-divider)]">{children}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
};

export default MobileCard;
