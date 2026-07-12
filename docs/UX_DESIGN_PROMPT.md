# KMainCMS UX Design Document Generation Prompt

**Project:** KMainCMS - Church Management System
**Target Platform:** Web Application (Responsive Desktop, Tablet, Mobile)
**Design Language:** Modern Web 2024/2025 - Clean, Professional, Accessible
**Document Date:** June 20, 2026

---

## Prompt for UX Design Document Generation

Create a comprehensive UX design document for KMainCMS (Church Management System) that follows the structure and depth of the Church SMS UX design document. 

**IMPORTANT:** First analyze the current implementation in the codebase, then generate the design document based on the actual current state. The document should:

1. **Audit Current Implementation** - Review the existing frontend components, pages, and navigation
2. **Identify UX Issues** - Note inconsistencies, confusing flows, missing features, and accessibility problems
3. **Build on Existing Patterns** - Preserve good patterns and improve upon weak ones
4. **Consider Technical Constraints** - Work within the current React/Vite architecture
5. **Optimize Current Workflows** - Improve existing user flows rather than redesigning from scratch

**Current Implementation Context:**
- Frontend: React with Vite, using React Router
- UI Components: Custom components with Lucide icons
- Current Modules: Dashboard, Members, Gallery, Departments, Documents, Payments, SMS, Announcements, Approvals, Settings
- Navigation: Sidebar-based navigation with permission filtering
- Styling: Tailwind CSS with dark mode support
- State Management: React Context API (AuthContext, ToastContext, ColorPaletteContext)
- Authentication: JWT-based with role-based access control
- File Structure: Modular component organization

**Reference UX Design Analysis Required:**
- Analyze the Ubuntu HRMS UX design at `D:\0000 SCO400 Project 2026\Ubuntu Software\documentation\deployment\UI-Genealogy.md`
- Extract best practices from the Ubuntu HRMS UI hierarchy and navigation patterns
- Identify successful patterns from Ubuntu HRMS that could be applied to KMainCMS
- Compare Ubuntu HRMS role-based dashboard approach with KMainCMS implementation
- Learn from Ubuntu HRMS's comprehensive module organization and user flows
- Analyze Ubuntu HRMS's approach to stats cards, quick actions, and tab-based navigation
- Review Ubuntu HRMS's permission-based access patterns across different user roles (Admin, Manager, Employee)
- Extract lessons from Ubuntu HRMS's data table implementations and drill-down patterns
- Study Ubuntu HRMS's settings organization and configuration patterns

**Current Implementation Analysis Required:**

### Current Component Inventory
- Analyze existing components in `frontend/src/components/`
- Review page components in `frontend/src/pages/`
- Document current navigation structure in `frontend/src/components/common/Sidebar.jsx`
- Review current layout patterns and component reuse

### Current Page Implementations
- Dashboard: Review current dashboard layout and widgets
- Members: Analyze MemberDirectory component and user management
- Gallery: Review GalleryManagement component and photo handling
- Departments: Review DepartmentDashboard and DepartmentsList components
- Documents: Review Documents component
- Payments: Review TreasuryDashboard component (renamed from Treasury)
- SMS: Review SMS component and messaging interface
- Announcements: Review Announcements component
- Approvals: Review ApprovalInbox component
- Settings: Review SiteSettings component

### Current UX Patterns
- Document current modal/dialog patterns
- Review current form validation patterns
- Analyze current loading states and error handling
- Document current notification/toast patterns
- Review current responsive design implementations

### Current Navigation Patterns
- Analyze sidebar navigation structure
- Review breadcrumb implementation (if any)
- Document current routing patterns
- Review permission-based navigation filtering
- Analyze current mobile navigation (if any)

### Current Data Display Patterns
- Review current table implementations
- Analyze current card layouts
- Document current list/grid view patterns
- Review current chart/graph implementations
- Analyze current status indicators

### Current Form Patterns
- Review current form component patterns
- Analyze current validation implementations
- Document current file upload patterns
- Review current rich text editor usage
- Analyze current form submission patterns

### Current Accessibility Implementation
- Review current ARIA labels and roles
- Analyze current keyboard navigation support
- Document current color contrast ratios
- Review current screen reader compatibility
- Analyze current focus management

### Current Performance Patterns
- Review current lazy loading implementation
- Analyze current loading states
- Document current code splitting
- Review current image optimization
- Analyze current bundle size

### Current Security UI Patterns
- Review current authentication UI
- Analyze current permission indicators
- Document current data privacy displays
- Review current session management UI

### Identified UX Issues to Address
Based on the current implementation analysis, identify:
- Inconsistent component patterns across modules
- Missing or incomplete loading states
- Poor error handling or unclear error messages
- Confusing navigation patterns
- Inaccessible components
- Performance bottlenecks
- Missing mobile responsiveness
- Inconsistent form validation
- Unclear permission indicators
- Poor empty state handling

---

## Required Document Structure

### 1. Design Principles
- Core design philosophy for the church management system
- Design principles specific to church administration workflows
- Accessibility and inclusivity considerations
- Performance and reliability requirements
- Trust and security considerations for sensitive church data

### 2. User Personas
Create detailed personas for all user types in the system:

#### Primary Personas:
- **Super Admin** - System administrator, manages all aspects
- **Pastor** - Senior pastor, oversees all church operations
- **First Elder** - Church elder, manages leadership decisions
- **Department Head** - Leads specific church departments
- **Treasurer** - Manages church finances and payments
- **Member** - Regular church member, accesses personal information

For each persona include:
- Role and responsibilities
- Age range and tech comfort level
- Goals and objectives
- Pain points and frustrations
- Usage patterns and frequency
- Key features needed
- Accessibility requirements

### 3. Information Architecture
- Complete app structure overview
- Module hierarchy and relationships
- Data organization across all modules
- Navigation depth for each module
- Cross-module data flows
- Permission-based access structure

### 4. Module-Based Screen Inventory
For each of the 10 main modules, create detailed screen inventories:

#### Core Modules:
1. **Dashboard** - Overview, statistics, quick actions
2. **Members** - Member directory, profiles, management
3. **Gallery** - Photo management, albums, media
4. **Departments** - Department management, hierarchies
5. **Documents** - Document repository, categorization
6. **Payments** - Financial management, transactions
7. **SMS** - Text messaging, communications
8. **Announcements** - Church announcements, news
9. **Approvals** - Request/approval workflows
10. **Settings** - System configuration

For each module include:
- Screen list with status (implemented/pending)
- Priority level for each screen
- User access requirements
- Dependencies on other modules
- Data requirements

### 5. Navigation & User Flows
- Main navigation structure (sidebar, tabs, breadcrumbs)
- Cross-module navigation patterns
- User journey maps for common workflows
- Task completion flows for each module
- Error state navigation
- Empty state navigation

#### Key User Flows to Document:
- Member registration and onboarding
- Department creation and management
- Payment processing and tracking
- SMS campaign creation and sending
- Document upload and sharing
- Event creation and RSVP
- Approval request and processing
- Role assignment and permission management
- Settings configuration

### 6. Screen-by-Screen UX Specifications
For each screen in each module, provide detailed specifications:

#### Screen Specification Template:
- **Screen Purpose**: What this screen accomplishes
- **User Access**: Which roles can access this screen
- **Layout Structure**: Grid system, component arrangement
- **Key Components**: List of all components on screen
- **User Actions**: Available actions and their triggers
- **Data Display**: How data is presented (tables, cards, lists)
- **Input Requirements**: Form fields, validation, error handling
- **Empty States**: What shows when no data exists
- **Loading States**: Progress indicators, skeleton screens
- **Error States**: Error messages, recovery actions
- **Responsive Behavior**: Mobile, tablet, desktop adaptations
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### 7. Component Library
Define a comprehensive component library:

#### Navigation Components:
- Sidebar navigation
- Breadcrumb navigation
- Tab navigation
- Pagination
- Quick action menus

#### Data Display Components:
- Data tables with sorting/filtering
- Card layouts
- List views
- Grid views
- Status indicators
- Progress bars
- Charts and graphs

#### Form Components:
- Input fields (text, number, email, date, etc.)
- Select dropdowns
- Checkboxes and radio buttons
- File upload components
- Rich text editors
- Form validation displays
- Submit/cancel actions

#### Feedback Components:
- Toast notifications
- Modal dialogs
- Confirmation dialogs
- Loading spinners
- Progress indicators
- Success/error states
- Empty states

#### Utility Components:
- User avatars
- Badges and tags
- Icons and icon buttons
- Tooltips
- Action menus
- Search components

### 8. Color & Typography
- Color palette for light and dark modes
- Primary, secondary, accent colors
- Status colors (success, warning, error, info)
- Typography scale (headings, body, captions)
- Font weights and styles
- Text hierarchy
- Line heights and spacing
- Responsive typography

### 9. Accessibility
- WCAG 2.1 AA compliance requirements
- Keyboard navigation patterns
- Screen reader compatibility
- Color contrast requirements
- Focus indicators
- ARIA labeling requirements
- Alternative text for images
- Error message accessibility

### 10. Responsive Design
- Breakpoint strategy (mobile, tablet, desktop)
- Mobile-first design approach
- Touch interaction patterns
- Gesture support
- Layout adaptations per breakpoint
- Performance considerations for mobile

### 11. Performance & Loading
- Loading state patterns
- Skeleton screens
- Progressive loading strategies
- Image optimization
- Code splitting considerations
- Caching strategies
- Offline support (if applicable)

### 12. Security & Privacy
- Authentication UI patterns
- Permission indicators
- Data privacy considerations
- Secure data display practices
- Audit trail visibility
- Session management UI

### 13. Workflow Optimization
Identify and document workflow improvements:

#### Current Workflow Issues:
- Identify redundant steps in current workflows
- Note confusing navigation patterns
- Highlight missing quick actions
- Document inefficient data entry patterns
- Note poor error recovery flows

#### Optimized Workflows:
- Streamlined user journeys
- Reduced click/tap counts
- Smart defaults and auto-population
- Bulk operation support
- Quick action implementations
- Keyboard shortcuts
- Drag-and-drop interfaces where appropriate

### 14. Module Integration Points
Document how modules should work together:

#### Cross-Module Data Flows:
- Members ↔ Departments
- Departments ↔ Treasury
- Treasury ↔ Payments
- SMS ↔ Announcements
- Approvals ↔ All modules
- Settings ↔ All modules

#### Shared Components:
- User selection across modules
- Date/time pickers
- File upload components
- Rich text editors
- Search and filter components

### 15. Future Version Considerations
- Analytics and reporting enhancements
- Mobile app integration
- Advanced automation features
- AI-powered assistance
- Integration with external systems
- Performance optimizations

### 16. Assets & Handoff
- Design file organization
- Component naming conventions
- Style guide structure
- Handoff requirements for developers
- Documentation maintenance

---

## Specific Module Requirements

### Dashboard Module
- Key metrics display
- Recent activity feed
- Quick action cards
- Personalized for user role
- Responsive widget layout

### Members Module
- Member directory with search/filter
- Member profile cards
- Bulk operations
- Import/export functionality
- Member status management

### Gallery Module
- Photo grid with filtering
- Album organization
- Upload functionality
- Lightbox viewing
- Tag management

### Departments Module
- Department hierarchy display
- Department management cards
- Member assignment
- Activity tracking
- Department settings

### Documents Module
- Document repository
- Category organization
- Upload/download
- Version control
- Access permissions

### Payments Module
- Transaction history
- Payment processing
- Budget tracking
- Financial reports
- Receipt generation

### SMS Module
- Message composition
- Contact selection
- Template management
- Delivery tracking
- SMS history

### Announcements Module
- Announcement creation
- Publishing workflow
- Scheduling
- Target audience selection
- Archive management

### Approvals Module
- Request listing
- Approval/rejection actions
- Status tracking
- Notification integration
- Comment threads

### Settings Module
- Categorized settings
- Form-based configuration
- Validation and feedback
- Reset to defaults
- Import/export settings

---

## Design Guidelines

### Visual Hierarchy
- Clear primary actions
- Secondary actions de-emphasized
- Consistent button sizing
- Proper spacing and grouping

### Interaction Design
- Clear affordances
- Immediate feedback
- Undo/redo where appropriate
- Confirmation for destructive actions
- Loading states for async operations

### Error Handling
- Clear error messages
- Recovery actions
- Contextual help
- Support contact information
- Error logging for debugging

### Empty States
- Helpful empty state messages
- Call-to-action buttons
- Illustrations or icons
- Educational content
- Links to documentation

### Loading States
- Skeleton screens for lists
- Progress indicators for uploads
- Spinners for async operations
- Time estimates where possible
- Cancellation options

---

## Accessibility Requirements

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Skip navigation links
- Keyboard shortcuts for common actions

### Screen Reader Support
- Proper ARIA labels
- Live regions for dynamic content
- Descriptive link text
- Alt text for images
- Form field descriptions

### Visual Accessibility
- Color contrast 4.5:1 minimum
- Text resizing support
- Focus indicators
- No seizure-inducing content
- Sufficient spacing

---

## Performance Guidelines

### Loading Performance
- Initial load < 3 seconds
- Route transitions < 500ms
- API responses < 1 second
- Image optimization
- Code splitting

### Runtime Performance
- Smooth animations (60fps)
- Efficient list rendering
- Minimal re-renders
- Memory management
- Bundle size optimization

---

## Security UI Considerations

### Authentication
- Clear login/logout flows
- Session timeout indicators
- Multi-device session management
- Two-factor authentication UI

### Authorization
- Permission indicators
- Access denied states
- Role-based UI variations
- Audit trail visibility

### Data Privacy
- Data masking for sensitive info
- Clear data retention policies
- Export restrictions
- Privacy policy links

---

## Mobile-Specific Considerations

### Touch Interactions
- Touch-friendly button sizes (44px minimum)
- Swipe gestures where appropriate
- Pull-to-refresh
- Bottom navigation for key actions
- Hamburger menu for secondary navigation

### Responsive Layouts
- Stacked layouts on mobile
- Collapsible sections
- Horizontal scrolling for tables
- Modal adaptations
- Font scaling

### Performance
- Reduced data requests
- Optimized images
- Lazy loading
- Offline indicators
- Progressive enhancement

---

## Developer Handoff Requirements

### Component Documentation
- Props documentation
- Usage examples
- Accessibility notes
- Responsive behavior
- State management

### Style Guide
- Color palette with hex codes
- Typography scale
- Spacing system
- Border radius values
- Shadow definitions
- Animation timing

### Design Tokens
- Design system variables
- Component variants
- Theme customization
- Responsive breakpoints
- Z-index scale

---

## Success Metrics

### User Experience
- Task completion rates
- Time to complete common tasks
- Error rates
- User satisfaction scores
- Accessibility compliance

### Performance
- Page load times
- Interaction response times
- Bundle sizes
- API response times
- Memory usage

### Business
- Feature adoption rates
- User engagement
- Support ticket reduction
- Training time reduction

---

## Implementation Priority

### Phase 1: Foundation (Immediate)
- Core navigation structure
- Basic component library
- Dashboard module
- Authentication flows
- Settings module

### Phase 2: Core Modules (High Priority)
- Members module
- Departments module
- Documents module
- Gallery module

### Phase 3: Advanced Modules (Medium Priority)
- Payments module
- SMS module
- Announcements module
- Approvals module

### Phase 4: Enhancement (Future)
- Advanced analytics
- Mobile app
- AI features
- Automation workflows

---

## Design Review Process

### Review Checklist
- [ ] Design principles followed
- [ ] User personas addressed
- [ ] Accessibility requirements met
- [ ] Responsive design implemented
- [ ] Performance considerations included
- [ ] Security requirements addressed
- [ ] Cross-module integration documented
- [ ] Error handling defined
- [ ] Loading states specified
- [ ] Empty states designed

### Approval Process
- Design review with stakeholders
- Usability testing with target users
- Accessibility audit
- Performance testing
- Security review
- Final sign-off

---

## Maintenance & Evolution

### Design System Maintenance
- Regular component audits
- Pattern library updates
- Accessibility improvements
- Performance optimizations
- User feedback integration

### Version Control
- Design versioning
- Component versioning
- Breaking change documentation
- Migration guides
- Deprecation notices

---

## Deliverables

### Design Assets
- Component library (Figma/Sketch)
- Style guide documentation
- Icon set
- Image assets
- Animation specifications

### Documentation
- This comprehensive UX design document
- Component documentation
- Usage guidelines
- Accessibility guide
- Developer handoff guide

### Prototypes
- Interactive prototypes for key flows
- Mobile prototypes
- Accessibility prototypes
- Performance demos

---

## Conclusion

This UX design document should serve as the single source of truth for all design decisions in KMainCMS. It should guide designers, developers, and stakeholders in creating a cohesive, accessible, and user-friendly church management system that serves the needs of all users from Super Admins to regular Members.

The document should be comprehensive enough to answer any design question, specific enough to guide implementation, and flexible enough to evolve with the system's needs.


### Current Implementation Analysis Required:

### Current Component Inventory
- Analyze existing components in rontend/src/components/
- Review page components in rontend/src/pages/
- Document current navigation structure in rontend/src/components/common/Sidebar.jsx
- Review current layout patterns and component reuse

### Current Page Implementations
- Dashboard: Review current dashboard layout and widgets
- Members: Analyze MemberDirectory component and user management
- Gallery: Review GalleryManagement component and photo handling
- Departments: Review DepartmentDashboard and DepartmentsList components
- Documents: Review Documents component
- Payments: Review TreasuryDashboard component (renamed from Treasury)
- SMS: Review SMS component and messaging interface
- Announcements: Review Announcements component
- Approvals: Review ApprovalInbox component
- Settings: Review SiteSettings component

### Current UX Patterns
- Document current modal/dialog patterns
- Review current form validation patterns
- Analyze current loading states and error handling
- Document current notification/toast patterns
- Review current responsive design implementations

### Current Navigation Patterns
- Analyze sidebar navigation structure
- Review breadcrumb implementation (if any)
- Document current routing patterns
- Review permission-based navigation filtering
- Analyze current mobile navigation (if any)

### Current Data Display Patterns
- Review current table implementations
- Analyze current card layouts
- Document current list/grid view patterns
- Review current chart/graph implementations
- Analyze current status indicators

### Current Form Patterns
- Review current form component patterns
- Analyze current validation implementations
- Document current file upload patterns
- Review current rich text editor usage
- Analyze current form submission patterns

### Current Accessibility Implementation
- Review current ARIA labels and roles
- Analyze current keyboard navigation support
- Document current color contrast ratios
- Review current screen reader compatibility
- Analyze current focus management

### Current Performance Patterns
- Review current lazy loading implementation
- Analyze current loading states
- Document current code splitting
- Review current image optimization
- Analyze current bundle size

### Current Security UI Patterns
- Review current authentication UI
- Analyze current permission indicators
- Document current data privacy displays
- Review current session management UI

### Identified UX Issues to Address
Based on the current implementation analysis, identify:
- Inconsistent component patterns across modules
- Missing or incomplete loading states
- Poor error handling or unclear error messages
- Confusing navigation patterns
- Inaccessible components
- Performance bottlenecks
 Missing mobile responsiveness
- Inconsistent form validation
- Unclear permission indicators
- Poor empty state handling

### Design Recommendations
Based on the analysis, provide specific recommendations:
- Which current patterns to preserve and standardize
- Which components need redesign or replacement
- Which workflows need optimization
- Which accessibility issues need immediate attention
- Which performance optimizations are most critical
- How to improve consistency across modules
- How to better support the identified user personas
- How to streamline complex workflows

