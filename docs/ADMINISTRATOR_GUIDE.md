# KMainCMS Administrator Guide

## Overview

This guide is for system administrators responsible for managing KMainCMS. It covers system configuration, user management, security, and maintenance tasks.

## Table of Contents
1. [System Administration](#system-administration)
2. [User Management](#user-management)
3. [Security Management](#security-management)
4. [Content Management](#content-management)
5. [Financial Management](#financial-management)
6. [Reporting & Analytics](#reporting--analytics)
7. [System Maintenance](#system-maintenance)
8. [Troubleshooting](#troubleshooting)

---

## System Administration

### Dashboard Overview

The administrator dashboard provides:
- System health indicators
- User activity statistics
- Storage usage
- Recent system events
- Quick administrative actions

### System Configuration

#### Basic Settings

1. Navigate to "Admin" → "Settings" → "General"
2. Configure:
   - Church name and information
   - Time zone and date format
   - Language preferences
   - Contact information

#### Email Configuration

1. Navigate to "Admin" → "Settings" → "Email"
2. Configure SMTP settings:
   - SMTP host and port
   - Authentication credentials
   - From email and name
   - Email templates

#### SMS Configuration

1. Navigate to "Admin" → "Settings" → "SMS"
2. Configure SMS providers:
   - Primary provider (e.g., Twilio, Africa's Talking)
   - Backup provider
   - API credentials
   - Sender ID

#### Payment Configuration

1. Navigate to "Admin" → "Settings" → "Payments"
2. Configure:
   - M-Pesa integration
   - Payment gateways
   - Processing fees
   - Receipt settings

### Database Management

#### Database Backups

**Automated Backups**
- Daily backups at 2:00 AM
- 30-day retention
- Automatic verification

**Manual Backup**
```bash
./scripts/backup-database.sh
```

**Restore from Backup**
```bash
./scripts/restore-database.sh kmaincms_20240623_120000.sql.gz
```

#### Database Migrations

Run migrations when updating the system:
```bash
cd backend
npm run migrate
```

### System Monitoring

#### Health Checks

Monitor system health:
- API health: `https://your-domain.com/api/health`
- Database health: `https://your-domain.com/api/health/db`
- Redis health: `https://your-domain.com/api/health/redis`

#### Performance Monitoring

Access monitoring dashboards:
- Grafana: `https://your-domain.com:3001`
- Prometheus: `https://your-domain.com:9090`

Key metrics to monitor:
- Response times
- Error rates
- Resource usage
- Database performance

---

## User Management

### User Roles

KMainCMS has several user roles with different permissions:

#### Super Admin
- Full system access
- User management
- System configuration
- Financial access

#### Admin
- Most system features
- User management (limited)
- Content management
- Reporting access

#### Department Head
- Department-specific access
- Department member management
- Department content
- Department reports

#### Leader
- Group management
- Group communication
- Group events
- Group reports

#### Member
- Personal profile
- Event registration
- Giving
- Basic features

### Creating Users

1. Navigate to "Admin" → "Users"
2. Click "Add User"
3. Fill in user information:
   - Name and email
   - Phone number
   - Role assignment
   - Department/group assignments
4. Set temporary password
5. Click "Create User"
6. User receives login credentials via email

### Managing User Roles

1. Go to user's profile
2. Click "Edit Role"
3. Select new role
4. Specify permissions
5. Click "Save"

### Deactivating Users

1. Navigate to user's profile
2. Click "Deactivate User"
3. Confirm deactivation
4. User loses system access

### User Activity Monitoring

1. Navigate to "Admin" → "User Activity"
2. View:
   - Login history
   - Feature usage
   - Last active dates
   - Suspicious activity alerts

### Bulk User Operations

**Import Users**
1. Navigate to "Admin" → "Users"
2. Click "Import Users"
3. Upload CSV file
4. Map columns
5. Review and confirm

**Export Users**
1. Navigate to "Admin" → "Users"
2. Click "Export Users"
3. Choose export format (CSV, Excel)
4. Select filters
5. Download file

---

## Security Management

### Access Control

#### Role-Based Access Control (RBAC)

Each role has specific permissions:
- Read access
- Write access
- Delete access
- Admin access

Configure permissions in:
"Admin" → "Settings" → "Roles & Permissions"

#### Two-Factor Authentication (2FA)

Enable 2FA for sensitive accounts:
1. Navigate to user's profile
2. Click "Security"
3. Enable "Two-Factor Authentication"
4. User sets up 2FA on next login

### Security Audits

#### Running Security Audit

```bash
cd backend
npm run security-audit
```

The audit checks:
- Secrets management
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication issues
- Authorization issues
- Input validation
- Dependency vulnerabilities

#### Reviewing Security Logs

1. Navigate to "Admin" → "Security Logs"
2. Review:
   - Failed login attempts
   - Permission changes
   - Data access logs
   - Configuration changes

### Password Policies

Configure password requirements:
- Minimum length (8+ characters)
- Complexity requirements
- Expiration period
- History requirements

### Session Management

#### Session Configuration

1. Navigate to "Admin" → "Settings" → "Security"
2. Configure:
   - Session timeout
   - Maximum concurrent sessions
   - Remember me duration

#### Active Sessions

1. Navigate to "Admin" → "Active Sessions"
2. View all active user sessions
3. Terminate suspicious sessions
4. Force logout for specific users

---

## Content Management

### Content Approval Workflow

Documents and announcements may require approval:

#### Approval Levels

1. **Basic** - Single approval
2. **Standard** - Two-level approval
3. **Critical** - Three-level approval

#### Managing Approvals

1. Navigate to "Admin" → "Approvals"
2. View pending items
3. Review content
4. Approve or reject
5. Add comments if needed

### Content Moderation

#### Reviewing User-Generated Content

1. Navigate to "Admin" → "Content Moderation"
2. Review flagged content
3. Take action:
   - Approve
   - Reject
   - Request changes
   - Remove content

### Media Management

#### Image Management

1. Navigate to "Admin" → "Media"
2. Upload images
3. Organize into albums
4. Set permissions
5. Optimize images

#### File Management

1. Navigate to "Admin" → "Documents"
2. Upload documents
3. Organize by category
4. Set access permissions
5. Version control

### Content Scheduling

Schedule content to be published:
1. Create content
2. Set publish date/time
3. Choose expiration (optional)
4. Save as scheduled
5. System auto-publishes at scheduled time

---

## Financial Management

### Giving Management

#### Viewing Giving Reports

1. Navigate to "Admin" → "Financial" → "Giving"
2. Filter by:
   - Date range
   - Giving type
   - Payment method
   - Department
3. View reports and export data

#### Reconciliation

1. Navigate to "Admin" → "Financial" → "Reconciliation"
2. Review unmatched transactions
3. Match payments to members
4. Resolve discrepancies
5. Generate reconciliation reports

#### Financial Reports

Available reports:
- Daily giving summary
- Monthly giving trends
- Annual giving statements
- Department breakdown
- Payment method analysis

### Budget Management

#### Creating Budgets

1. Navigate to "Admin" → "Financial" → "Budgets"
2. Click "Create Budget"
3. Set budget parameters:
   - Budget period
   - Categories
   - Amounts
   - Allocations
4. Save budget

#### Budget Tracking

1. Navigate to "Admin" → "Financial" → "Budget Tracking"
2. Compare actual vs. budget
3. View variances
4. Generate reports

### Expense Management

#### Recording Expenses

1. Navigate to "Admin" → "Financial" → "Expenses"
2. Click "Add Expense"
3. Fill in details:
   - Amount
   - Category
   - Description
   - Approval required
4. Attach receipts
5. Submit for approval

#### Expense Approval

1. Navigate to "Admin" → "Financial" → "Expense Approvals"
2. Review pending expenses
3. Approve or reject
4. Add comments

---

## Reporting & Analytics

### Standard Reports

#### Member Reports

- Membership growth
- Attendance trends
- Member engagement
- Demographic analysis

#### Financial Reports

- Giving summaries
- Budget performance
- Expense analysis
- Financial health

#### Event Reports

- Event attendance
- Event success metrics
- Registration trends
- Feedback analysis

### Custom Reports

#### Creating Custom Reports

1. Navigate to "Admin" → "Reports" → "Custom"
2. Click "Create Report"
3. Select data sources
4. Set filters and parameters
5. Choose visualization type
6. Save and schedule

#### Scheduled Reports

1. Create or edit report
2. Click "Schedule"
3. Set frequency:
   - Daily
   - Weekly
   - Monthly
4. Choose recipients
5. Save schedule

### Data Export

#### Export Options

- CSV
- Excel
- PDF
- JSON

#### Export Process

1. Navigate to desired report
2. Click "Export"
3. Choose format
4. Set date range
5. Download file

---

## System Maintenance

### Regular Maintenance Tasks

#### Daily

- Review system health dashboard
- Check for failed backups
- Review security logs
- Monitor system performance

#### Weekly

- Review user activity
- Check storage usage
- Review error logs
- Test backup restoration

#### Monthly

- Review and update user roles
- Audit security settings
- Review financial reconciliations
- Generate monthly reports

#### Quarterly

- Review and update documentation
- Conduct security audit
- Review system performance
- Plan system updates

### System Updates

#### Pre-Update Checklist

- [ ] Create full system backup
- [ ] Test update in staging environment
- [ ] Notify users of planned maintenance
- [ ] Review update notes
- [ ] Prepare rollback plan

#### Update Process

1. Navigate to "Admin" → "System" → "Updates"
2. Check for available updates
3. Review update details
4. Schedule update time
5. Execute update
6. Verify system functionality
7. Monitor for issues

### Performance Optimization

#### Database Optimization

```bash
# Run database optimization
cd backend
npm run db:optimize
```

#### Cache Management

1. Navigate to "Admin" → "System" → "Cache"
2. Clear cache:
   - Application cache
   - Redis cache
   - Browser cache
3. Rebuild cache if needed

#### Log Management

1. Navigate to "Admin" → "System" → "Logs"
2. Review log files
3. Archive old logs
4. Set log retention policy

---

## Troubleshooting

### Common Issues

#### System Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:
1. Check system resources (CPU, memory, disk)
2. Review database performance
3. Clear system cache
4. Check for long-running processes
5. Review error logs

#### User Login Issues

**Symptoms**: Users can't log in

**Solutions**:
1. Verify user credentials
2. Check account status (not locked/deactivated)
3. Reset user password
4. Check authentication service
5. Review security logs

#### Email/SMS Not Sending

**Symptoms**: Notifications not delivered

**Solutions**:
1. Check service provider status
2. Verify API credentials
3. Review delivery logs
4. Check account balance
5. Test provider connection

#### Payment Processing Issues

**Symptoms**: Payments failing or not recording

**Solutions**:
1. Check payment gateway status
2. Verify API credentials
3. Review transaction logs
4. Check for failed reconciliations
5. Contact payment provider

### Emergency Procedures

#### System Down

1. Check monitoring dashboards
2. Review error logs
3. Restart affected services
4. If persistent, restore from backup
5. Notify stakeholders

#### Data Breach

1. Immediately isolate affected systems
2. Change all credentials
3. Review access logs
4. Notify security team
5. Document incident
6. Communicate with affected users

#### Data Corruption

1. Stop all write operations
2. Assess extent of corruption
3. Restore from recent backup
4. Verify data integrity
5. Restart services
6. Monitor for issues

### Getting Help

#### Internal Resources

- System documentation
- Knowledge base
- Team expertise

#### External Support

- Technical support contact
- Vendor support
- Community forums

#### Escalation Process

1. Level 1: Basic troubleshooting
2. Level 2: Advanced technical support
3. Level 3: Vendor/developer support

---

## Best Practices

### Security Best Practices

- **Regular security audits** - Monthly security reviews
- **Principle of least privilege** - Minimum required access
- **Regular password updates** - Enforce password changes
- **Monitor access logs** - Review suspicious activity
- **Keep systems updated** - Apply security patches promptly

### Data Management Best Practices

- **Regular backups** - Automated daily backups
- **Test restoration** - Verify backup integrity
- **Data retention policies** - Define and enforce retention
- **Data classification** - Label sensitive data
- **Access logging** - Track data access

### User Management Best Practices

- **Regular role reviews** - Quarterly access reviews
- **Onboarding process** - Structured user setup
- **Offboarding process** - Prompt access revocation
- **Training programs** - Regular user education
- **Feedback collection** - Gather user input

---

## Conclusion

Effective administration of KMainCMS requires:

- Regular monitoring and maintenance
- Proactive security management
- Efficient user support
- Continuous improvement
- Documentation and knowledge sharing

By following this guide and implementing best practices, administrators can ensure reliable, secure, and efficient operation of the church management system.

For additional support or questions, refer to the technical documentation or contact the support team.
