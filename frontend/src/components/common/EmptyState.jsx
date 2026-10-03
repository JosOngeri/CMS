/**
 * @audit Empty-state variants (Members/Events/Gallery/etc).
 * @fixed action/secondaryAction icon props assigned to capitalised variables
 *        before render (lowercase JSX rendered literal DOM elements); buttons
 *        now key off onAction/onSecondaryAction alone; invalid `size` falls
 *        back to 'default'.
 */
import { Users, FileText, Calendar, Building, Search, Plus, AlertCircle, Image as ImageIcon, Info, ArrowRight, BarChart3, Shield } from 'lucide-react'

/**
 * EmptyState - A reusable empty state component with enhanced features
 */
export const EmptyState = ({
  icon: Icon = AlertCircle,
  title = 'No data found',
  description = 'There is no data to display at this time.',
  action = null,
  actionLabel = 'Add New',
  onAction = null,
  secondaryAction = null,
  secondaryActionLabel = 'Learn More',
  onSecondaryAction = null,
  illustration = null,
  size = 'default' // 'small', 'default', 'large'
}) => {
  const sizeClasses = {
    small: 'py-8',
    default: 'py-12',
    large: 'py-16'
  }

  const iconSizes = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  // Unknown size props fall back to 'default' instead of producing
  // `undefined` in the class string.
  const safeSize = sizeClasses[size] ? size : 'default';
  // Icon props arrive as component references — JSX requires capitalised
  // variables, so assign them before rendering (lowercase renders a literal
  // DOM element and the icon never appears).
  const ActionIcon = typeof action === 'function' ? action : Plus;
  const SecondaryActionIcon = typeof secondaryAction === 'function' ? secondaryAction : Info;

  return (
    <div className={`flex flex-col items-center justify-center px-4 ${sizeClasses[safeSize]}`}>
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-6">
          {illustration}
        </div>
      ) : (
        <div className="p-4 rounded-full mb-4 bg-[var(--color-background)]">
          <Icon className={`${iconSizes[safeSize]} text-[var(--color-textSecondary)]`} />
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-medium mb-2 text-center text-[var(--color-text)]">
        {title}
      </h3>

      {/* Description */}
      <p className="text-center max-w-md mb-6 text-[var(--color-textSecondary)]">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-[var(--color-primary)] text-[var(--color-on-solid)] hover:bg-[var(--color-primary-600)]"
            aria-label={actionLabel}
          >
            <ActionIcon className="w-4 h-4" />
            {actionLabel}
          </button>
        )}

        {onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-textSecondary)] transition-colors hover:bg-[var(--color-surfaceHover)] hover:border-[var(--color-textSecondary)]"
            aria-label={secondaryActionLabel}
          >
            <SecondaryActionIcon className="w-4 h-4" />
            {secondaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * MembersEmptyState - Empty state for member directory
 */
export const MembersEmptyState = ({ onAddMember, onLearnMore }) => {
  return (
    <EmptyState
      icon={Users}
      title="No members found"
      description="No members have been added to the directory yet. Get started by adding your first member."
      action={Users}
      actionLabel="Add Member"
      onAction={onAddMember}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * AnnouncementsEmptyState - Empty state for announcements
 */
export const AnnouncementsEmptyState = ({ onCreateAnnouncement, onLearnMore }) => {
  return (
    <EmptyState
      icon={FileText}
      title="No announcements"
      description="There are no announcements at this time. Create an announcement to keep your congregation informed."
      action={FileText}
      actionLabel="Create Announcement"
      onAction={onCreateAnnouncement}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * EventsEmptyState - Empty state for events
 */
export const EventsEmptyState = ({ onCreateEvent, onLearnMore }) => {
  return (
    <EmptyState
      icon={Calendar}
      title="No upcoming events"
      description="There are no upcoming events scheduled. Create an event to engage your congregation."
      action={Calendar}
      actionLabel="Create Event"
      onAction={onCreateEvent}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * DepartmentsEmptyState - Empty state for departments
 */
export const DepartmentsEmptyState = ({ onCreateDepartment, onLearnMore }) => {
  return (
    <EmptyState
      icon={Building}
      title="No departments"
      description="No departments have been created yet. Create departments to organize your church ministries."
      action={Building}
      actionLabel="Create Department"
      onAction={onCreateDepartment}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * SearchEmptyState - Empty state for search results
 */
export const SearchEmptyState = ({ searchTerm, onClearSearch }) => {
  return (
    <EmptyState
      icon={Search}
      title={`No results for "${searchTerm}"`}
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={onClearSearch ? Search : null}
      actionLabel="Clear Search"
      onAction={onClearSearch}
      size="small"
    />
  )
}

/**
 * PaymentsEmptyState - Empty state for payments
 */
export const PaymentsEmptyState = ({ onMakePayment, onLearnMore }) => {
  return (
    <EmptyState
      icon={FileText}
      title="No payment history"
      description="You haven't made any payments yet. Make your first payment to support the church."
      action={FileText}
      actionLabel="Make Payment"
      onAction={onMakePayment}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * GalleryEmptyState - Empty state for gallery/photos
 */
export const GalleryEmptyState = ({ onUploadPhoto, onLearnMore }) => {
  return (
    <EmptyState
      icon={ImageIcon}
      title="No photos yet"
      description="No photos have been uploaded to the gallery yet. Upload photos to share church memories."
      action={ImageIcon}
      actionLabel="Upload Photo"
      onAction={onUploadPhoto}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * ErrorEmptyState - Empty state for error states
 */
export const ErrorEmptyState = ({ message = 'Something went wrong', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-full mb-4 bg-[var(--color-error-light)]">
        <AlertCircle className="w-12 h-12 text-[var(--color-error)]" />
      </div>
      <h3 className="text-lg font-medium mb-2 text-[var(--color-text)]">
        Error
      </h3>
      <p className="text-center max-w-md mb-4 text-[var(--color-textSecondary)]">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg transition-colors bg-[var(--color-primary)] text-[var(--color-on-solid)] hover:bg-[var(--color-primary-600)]"
          aria-label="Retry operation"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * ResourcesEmptyState - Empty state for resources
 */
export const ResourcesEmptyState = ({ onUploadResource, onLearnMore }) => {
  return (
    <EmptyState
      icon={FileText}
      title="No resources"
      description="No resources have been uploaded yet. Upload documents, media, and other resources to share with your congregation."
      action={FileText}
      actionLabel="Upload Resource"
      onAction={onUploadResource}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * InsightsEmptyState - Empty state for insights/analytics
 */
export const InsightsEmptyState = ({ onGenerateReport, onLearnMore }) => {
  return (
    <EmptyState
      icon={BarChart3}
      title="No insights available"
      description="There are no insights or analytics data available yet. Generate reports to view church operations data."
      action={BarChart3}
      actionLabel="Generate Report"
      onAction={onGenerateReport}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}

/**
 * AdministrationEmptyState - Empty state for administration
 */
export const AdministrationEmptyState = ({ onAddUser, onLearnMore }) => {
  return (
    <EmptyState
      icon={Shield}
      title="No users configured"
      description="No users have been configured yet. Add users to manage access to the system."
      action={Shield}
      actionLabel="Add User"
      onAction={onAddUser}
      secondaryAction={Info}
      secondaryActionLabel="Learn More"
      onSecondaryAction={onLearnMore}
      size="default"
    />
  )
}
