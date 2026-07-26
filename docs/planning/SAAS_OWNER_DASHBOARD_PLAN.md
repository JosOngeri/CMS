# SaaS Owner Dashboard Plan

## Document Overview

This document outlines the plan for creating a comprehensive SaaS Owner Dashboard (Platform Admin Dashboard) for KMainCMS. This dashboard will provide the SaaS platform owner with a centralized view of all tenants, platform performance metrics, revenue analytics, and administrative capabilities for managing the multi-tenant church management system.

## 1. Business Objectives

### 1.1 Primary Goals
- Provide platform-level visibility into all church tenants
- Enable centralized tenant management and administration
- Deliver comprehensive revenue and subscription analytics
- Monitor platform health and performance metrics
- Streamline onboarding and support processes

### 1.2 Target Users
- **SaaS Platform Owner** - Full access to all platform features
- **Platform Administrators** - Limited administrative access
- **Support Team** - Read-only access for troubleshooting

### 1.3 Success Metrics
- Reduced time to onboard new churches by 50%
- Improved tenant issue resolution time by 40%
- Increased platform revenue visibility and forecasting accuracy
- Enhanced platform health monitoring and proactive issue detection

## 2. Dashboard Features and Components

### 2.1 Platform Overview Dashboard

#### Key Metrics Display
- **Total Active Churches** - Number of active church tenants
- **Total Monthly Recurring Revenue (MRR)** - Platform-wide revenue
- **New Churches This Month** - Onboarding metrics
- **Churn Rate** - Monthly tenant churn percentage
- **Average Revenue Per Church (ARPC)** - Revenue analytics
- **Platform Health Score** - Overall system health indicator

#### Visual Components
- Revenue trend charts (monthly/quarterly/yearly)
- Church growth timeline
- Geographic distribution map
- Subscription tier distribution
- Platform uptime indicators

### 2.2 Tenant Management Module

#### Church List View
- **Searchable table** with all church tenants
- **Filtering options** by status, subscription tier, region
- **Sort capabilities** by various metrics
- **Quick actions** for common tasks

#### Church Detail View
- **Basic Information** - Name, slug, contact details
- **Subscription Details** - Plan, billing cycle, status
- **Usage Metrics** - Active users, storage, API calls
- **Performance Metrics** - Login frequency, feature usage
- **Support History** - Tickets, issues, resolutions
- **Activity Timeline** - Recent changes and events

#### Tenant Actions
- **Create new church** - Onboarding wizard
- **Edit church details** - Information management
- **Suspend/Reactivate** - Account status management
- **Upgrade/Downgrade** - Subscription management
- **Delete church** - With safety checks and confirmations

### 2.3 Revenue and Analytics Module

#### Revenue Overview
- **Total Revenue** - All-time and period-based
- **Revenue by Subscription Tier** - Breakdown by plan
- **Revenue Trends** - Growth patterns and forecasts
- **Payment Processing Status** - Transaction health
- **Outstanding Invoices** - Billing management

#### Subscription Analytics
- **Subscription Distribution** - Plan popularity
- **Upgrade/Downgrade Trends** - Migration patterns
- **Churn Analysis** - Reasons and patterns
- **Lifetime Value (LTV)** - Customer value metrics
- **Customer Acquisition Cost (CAC)** - Marketing efficiency

#### Financial Reports
- **Monthly Revenue Reports** - Detailed breakdowns
- **Annual Revenue Summaries** - Year-over-year comparison
- **Revenue Forecasts** - Predictive analytics
- **Export Capabilities** - CSV, PDF reports

### 2.4 Platform Health Monitoring

#### System Health Dashboard
- **API Response Times** - Performance metrics
- **Database Performance** - Query health indicators
- **Server Resources** - CPU, memory, disk usage
- **Uptime Monitoring** - Availability tracking
- **Error Rates** - System stability metrics

#### Service Status
- **Authentication Service** - Login/registration health
- **Database Service** - Data layer performance
- **File Storage** - Media handling status
- **SMS Gateway** - Messaging service health
- **Payment Processing** - Financial service status

#### Alerting System
- **Real-time Alerts** - Critical system issues
- **Performance Thresholds** - Warning levels
- **Notification Channels** - Email, SMS, dashboard
- **Alert History** - Past incidents and resolutions

### 2.5 User and Access Management

#### Platform Users
- **Platform Administrators** - SaaS team members
- **Support Staff** - Customer service team
- **Role Management** - Permission assignment
- **Activity Logs** - User actions and audit trail

#### Access Control
- **Role-Based Permissions** - Granular access control
- **Authentication Methods** - SSO, MFA options
- **Session Management** - Active sessions monitoring
- **Security Audit Logs** - Access and security events

### 2.6 Support and Troubleshooting

#### Support Dashboard
- **Active Tickets** - Open support requests
- **Ticket Queue** - Assignment and prioritization
- **Response Time Metrics** - Support performance
- **Resolution Rate** - Issue tracking

#### Church-Specific Support
- **Church Context View** - Tenant-specific issues
- **Quick Actions** - Common support tasks
- **Remote Access** - Admin assistance capabilities
- **Communication Tools** - Direct messaging

## 3. Technical Implementation Approach

### 3.1 Frontend Architecture

#### Component Structure
```
frontend/src/pages/platform/
├── PlatformDashboard.jsx          # Main dashboard
├── tenants/
│   ├── TenantList.jsx            # Church list view
│   ├── TenantDetail.jsx          # Church detail view
│   ├── TenantCreate.jsx          # Onboarding wizard
│   └── TenantSettings.jsx        # Tenant management
├── analytics/
│   ├── RevenueOverview.jsx       # Revenue dashboard
│   ├── SubscriptionAnalytics.jsx # Subscription metrics
│   └── FinancialReports.jsx      # Financial reporting
├── monitoring/
│   ├── SystemHealth.jsx          # Platform health
│   ├── ServiceStatus.jsx         # Service monitoring
│   └── AlertManagement.jsx      # Alert configuration
├── users/
│   ├── PlatformUsers.jsx         # Platform user management
│   ├── RoleManagement.jsx        # Role and permissions
│   └── AccessLogs.jsx           # Security audit logs
└── support/
    ├── SupportDashboard.jsx      # Support ticket management
    ├── TicketDetail.jsx          # Individual ticket view
    └── CommunicationTools.jsx   # Support communication
```

#### Technology Stack
- **React** - UI framework
- **Recharts** - Data visualization
- **React Router** - Navigation
- **Axios** - API communication
- **Context API** - State management
- **Tailwind CSS** - Styling

### 3.2 Backend Architecture

#### API Endpoints

##### Platform Overview
```
GET  /api/platform/stats                    # Platform-wide statistics
GET  /api/platform/health                   # Platform health status
GET  /api/platform/metrics                 # Performance metrics
```

##### Tenant Management
```
GET    /api/platform/tenants               # List all churches
GET    /api/platform/tenants/:id           # Get church details
POST   /api/platform/tenants               # Create new church
PUT    /api/platform/tenants/:id           # Update church
DELETE /api/platform/tenants/:id           # Delete church
POST   /api/platform/tenants/:id/suspend   # Suspend church
POST   /api/platform/tenants/:id/activate  # Reactivate church
GET    /api/platform/tenants/:id/stats     # Church statistics
GET    /api/platform/tenants/:id/activity  # Church activity log
```

##### Revenue Analytics
```
GET  /api/platform/revenue/overview        # Revenue overview
GET  /api/platform/revenue/by-tier        # Revenue by subscription
GET  /api/platform/revenue/trends          # Revenue trends
GET  /api/platform/revenue/forecasts       # Revenue forecasts
GET  /api/platform/subscriptions/analytics # Subscription analytics
GET  /api/platform/churn/analysis          # Churn analysis
```

##### Platform Monitoring
```
GET  /api/platform/health/system           # System health
GET  /api/platform/health/services         # Service status
GET  /api/platform/metrics/performance     # Performance metrics
GET  /api/platform/alerts                  # Active alerts
POST /api/platform/alerts/configure        # Configure alerts
```

##### Platform Users
```
GET    /api/platform/users                 # Platform users
POST   /api/platform/users                 # Create platform user
PUT    /api/platform/users/:id             # Update user
DELETE /api/platform/users/:id             # Delete user
GET    /api/platform/roles                 # Available roles
POST   /api/platform/roles                 # Create role
GET    /api/platform/audit-logs            # Security audit logs
```

#### Database Schema Extensions

##### Platform Statistics Table
```sql
CREATE TABLE platform_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL,
  total_churches INTEGER DEFAULT 0,
  active_churches INTEGER DEFAULT 0,
  total_mrr DECIMAL(10,2) DEFAULT 0,
  new_churches INTEGER DEFAULT 0,
  churned_churches INTEGER DEFAULT 0,
  arpc DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### Platform Health Table
```sql
CREATE TABLE platform_health (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  response_time INTEGER,
  error_rate DECIMAL(5,2),
  last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);
```

##### Platform Alerts Table
```sql
CREATE TABLE platform_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  service_affected VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);
```

##### Platform Users Table
```sql
CREATE TABLE platform_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  permissions JSONB,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### Audit Logs Table
```sql
CREATE TABLE platform_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES platform_users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Integration with Existing Systems

#### Authentication Integration
- Extend existing JWT authentication for platform users
- Add platform-specific role claims
- Implement platform user session management
- Integrate with existing user management

#### Multi-Tenancy Integration
- Leverage existing tenant resolver middleware
- Extend church management APIs for platform access
- Utilize existing church statistics endpoints
- Integrate with subscription management

#### Monitoring Integration
- Connect with existing logging infrastructure
- Integrate with current error tracking
- Extend health check endpoints
- Utilize existing performance monitoring

## 4. Security Considerations

### 4.1 Access Control
- **Role-Based Access Control (RBAC)** - Granular permissions
- **Platform-Specific Roles** - Separate from church roles
- **Multi-Factor Authentication** - Enhanced security
- **Session Management** - Secure session handling

### 4.2 Data Protection
- **Data Isolation** - Platform data separate from tenant data
- **Encryption** - Sensitive data encryption at rest
- **Audit Logging** - Comprehensive activity tracking
- **Backup Strategy** - Platform data backup procedures

### 4.3 API Security
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Sanitize all inputs
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Output encoding

## 5. Development Timeline

### Phase 1: Foundation (Week 1-2)
- Set up project structure and routing
- Create basic dashboard layout
- Implement authentication for platform users
- Set up database schema extensions
- Create basic API endpoints

### Phase 2: Core Features (Week 3-4)
- Implement platform overview dashboard
- Create tenant list and detail views
- Build tenant management functionality
- Add basic revenue analytics
- Implement platform health monitoring

### Phase 3: Advanced Features (Week 5-6)
- Develop comprehensive analytics module
- Create advanced tenant management features
- Implement alerting system
- Build support dashboard
- Add user and access management

### Phase 4: Integration and Testing (Week 7-8)
- Integrate with existing systems
- Perform comprehensive testing
- Security audit and hardening
- Performance optimization
- Documentation completion

### Phase 5: Deployment (Week 9)
- Deploy to staging environment
- User acceptance testing
- Production deployment
- Post-deployment monitoring
- Training and handover

## 6. Testing Strategy

### 6.1 Unit Testing
- Component testing for React components
- Service layer testing for business logic
- Repository testing for data access
- Utility function testing

### 6.2 Integration Testing
- API endpoint testing
- Database integration testing
- Authentication flow testing
- Multi-tenancy integration testing

### 6.3 End-to-End Testing
- User workflow testing
- Cross-browser compatibility testing
- Performance testing
- Security testing

### 6.4 User Acceptance Testing
- Stakeholder review sessions
- Usability testing
- Feature validation
- Performance validation

## 7. Success Criteria

### 7.1 Functional Requirements
- ✅ Platform owner can view all church tenants
- ✅ Platform owner can manage church accounts
- ✅ Platform owner can view revenue analytics
- ✅ Platform owner can monitor system health
- ✅ Platform owner can manage platform users

### 7.2 Non-Functional Requirements
- ✅ Dashboard loads within 3 seconds
- ✅ API responses under 500ms
- ✅ 99.9% uptime for platform services
- ✅ Support for 1000+ concurrent platform users
- ✅ Comprehensive audit logging

### 7.3 Business Requirements
- ✅ Reduced onboarding time by 50%
- ✅ Improved issue resolution by 40%
- ✅ Enhanced revenue visibility
- ✅ Proactive system monitoring
- ✅ Streamlined support processes

## 8. Maintenance and Future Enhancements

### 8.1 Maintenance Plan
- Regular security updates
- Performance monitoring and optimization
- Feature updates based on feedback
- Bug fixes and patches

### 8.2 Future Enhancements
- Advanced AI-powered analytics
- Automated onboarding workflows
- Integration with additional payment gateways
- Mobile platform admin app
- Advanced forecasting and predictive analytics

## 9. Conclusion

This SaaS Owner Dashboard will provide comprehensive platform management capabilities, enabling efficient administration of the multi-tenant church management system. The implementation follows existing architectural patterns and integrates seamlessly with current systems while providing the enhanced visibility and control needed for effective SaaS platform management.

The phased development approach ensures incremental value delivery while maintaining quality and security standards. Regular testing and stakeholder involvement will ensure the final product meets business requirements and user needs.