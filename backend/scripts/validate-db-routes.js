const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const controllersDir = path.join(__dirname, '../controllers');
const helpersDir = path.join(__dirname, '../helpers');
const middlewareDir = path.join(__dirname, '../middleware');
const repositoriesDir = path.join(__dirname, '../repositories');
const servicesDir = path.join(__dirname, '../services');
const modulesDir = path.join(__dirname, '../modules');

let output = '# Database Tables vs API Routes Validation\n\n';
output += '**Generated:** ' + new Date().toISOString().split('T')[0] + '\n\n';
output += 'This document validates that database tables referenced in code have corresponding API endpoints.\n\n';
output += '---\n\n';

// Function to recursively get all JS files
function getJsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Extract table names from SQL queries
function extractTableNames(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tables = new Set();
  
  // Match table names in FROM, JOIN, INSERT INTO, UPDATE, DELETE FROM
  const patterns = [
    /FROM\s+([a-z_][a-z0-9_]*)/gi,
    /JOIN\s+([a-z_][a-z0-9_]*)/gi,
    /INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/gi,
    /UPDATE\s+([a-z_][a-z0-9_]*)/gi,
    /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/gi,
  ];
  
  // Filter out SQL keywords, JS keywords, and common non-table terms
  const excludeTerms = new Set([
    // SQL keywords
    'where', 'select', 'as', 'on', 'and', 'or', 'order', 'by', 'group', 'having', 'limit', 'offset',
    'distinct', 'inner', 'outer', 'left', 'right', 'full', 'cross', 'natural', 'union', 'intersect',
    'except', 'case', 'when', 'then', 'else', 'end', 'exists', 'in', 'between', 'like', 'is',
    'null', 'true', 'false', 'not', 'asc', 'desc', 'with', 'recursive', 'for', 'update',
    // JavaScript/programming terms
    'a', 'all', 'await', 'const', 'database', 'error', 'now', 'password', 'query', 'request', 'response',
    'router', 'm', 'last', 'created_at', 'current_date', 'multiple', 'kopokopo', 'je', 'journal',
    'account', 'account_tree', 'album', 'announcement', 'approval', 'budget', 'campaign', 'category',
    'channel', 'collection', 'comment', 'content', 'contributions', 'department', 'document', 'event',
    'expense', 'fund', 'journal', 'member', 'palette', 'payment', 'photo', 'pledge', 'post', 'preferences',
    'profile', 'project', 'receipts', 'recurring', 'refunds', 'role', 'saved', 'scheduled', 'settings',
    'telegram', 'user', 'vendor', 'activities', 'activity', 'api', 'auth', 'blocked', 'church', 'color',
    'documentation', 'failed', 'field', 'fixed', 'income', 'information', 'item', 'journal_entry', 'login',
    'member_group', 'notification', 'password_reset', 'personal', 'refresh', 'report', 'role_permission',
    'saved_search', 'scheduled_report', 'security', 'sms', 'telegram_channel', 'telegram_photo', 'user_role',
    // Common English words and programming terms
    'the', 'their', 'this', 'that', 'those', 'these', 'status', 'tags', 'task', 'title', 'types', 'ubuntu',
    'various', 'website', 'wrapper', 'selects', 'set', 'slug', 'seo', 'colors',
    // Common aliases
    't', 'u', 'd', 'p', 'c', 'm', 'e', 'a', 'n', 's', 'r', 'l', 'i', 'o', 'f', 'b', 'g', 'h', 'j', 'k',
    'x', 'y', 'z', 'q', 'w', 'v'
  ]);
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const table = match[1].toLowerCase();
      // Only include if it looks like a real table name (has underscore or is longer than 2 chars)
      if (!excludeTerms.has(table) && (table.includes('_') || table.length > 2)) {
        tables.add(table);
      }
    }
  });
  
  return Array.from(tables);
}

// Extract routes from a file
function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  return routes;
}

// Get all table names from code
output += '## Database Tables Found in Code\n\n';

const dbDirs = [
  { dir: controllersDir, label: 'Controllers' },
  { dir: helpersDir, label: 'Helpers' },
  { dir: middlewareDir, label: 'Middleware' },
  { dir: repositoriesDir, label: 'Repositories' },
  { dir: servicesDir, label: 'Services' },
  { dir: routesDir, label: 'Routes with Inline Queries' }
];

const allTables = new Map(); // table -> files that reference it

dbDirs.forEach(({ dir, label }) => {
  if (fs.existsSync(dir)) {
    const files = getJsFiles(dir);
    files.forEach(filePath => {
      const tables = extractTableNames(filePath);
      if (tables.length > 0) {
        const relativePath = path.relative(path.join(__dirname, '../'), filePath);
        tables.forEach(table => {
          if (!allTables.has(table)) {
            allTables.set(table, []);
          }
          allTables.get(table).push(relativePath);
        });
      }
    });
  }
});

// Process modules for table names
if (fs.existsSync(modulesDir)) {
  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  moduleDirs.forEach(moduleName => {
    const modulePath = path.join(modulesDir, moduleName);
    const subdirs = ['controllers', 'repositories', 'services', 'routes'];
    subdirs.forEach(subdir => {
      const subPath = path.join(modulePath, subdir);
      if (fs.existsSync(subPath)) {
        const files = getJsFiles(subPath);
        files.forEach(filePath => {
          const tables = extractTableNames(filePath);
          if (tables.length > 0) {
            const relativePath = path.relative(path.join(__dirname, '../'), filePath);
            tables.forEach(table => {
              if (!allTables.has(table)) {
                allTables.set(table, []);
              }
              allTables.get(table).push(relativePath);
            });
          }
        });
      }
    });
  });
}

// Sort tables alphabetically
const sortedTables = Array.from(allTables.entries()).sort((a, b) => a[0].localeCompare(b[0]));

output += '| Table Name | Referenced In |\n';
output += '|------------|--------------|\n';

sortedTables.forEach(([table, files]) => {
  output += `| \`${table}\` | ${files.length} file(s) |\n`;
});

output += `\n**Total Tables:** ${sortedTables.length}\n\n`;

// Get all routes
output += '---\n\n';
output += '## API Routes Found\n\n';

const routeFiles = getJsFiles(routesDir);
const allRoutes = [];

routeFiles.forEach(filePath => {
  const routes = extractRoutes(filePath);
  routes.forEach(route => {
    allRoutes.push({
      ...route,
      file: path.relative(path.join(__dirname, '../'), filePath)
    });
  });
});

// Add treasury module routes
const treasuryRoutesDir = path.join(modulesDir, 'treasury/routes');
if (fs.existsSync(treasuryRoutesDir)) {
  const treasuryRouteFiles = getJsFiles(treasuryRoutesDir);
  treasuryRouteFiles.forEach(filePath => {
    const routes = extractRoutes(filePath);
    routes.forEach(route => {
      allRoutes.push({
        ...route,
        file: path.relative(path.join(__dirname, '../'), filePath)
      });
    });
  });
}

output += '| Method | Path | File |\n';
output += '|--------|------|------|\n';

allRoutes.forEach(route => {
  output += `| ${route.method} | \`${route.path}\` | ${route.file} |\n`;
});

output += `\n**Total Routes:** ${allRoutes.length}\n\n`;

// Analyze coverage
output += '---\n\n';
output += '## Coverage Analysis\n\n';

// Map tables to likely route paths (can be multiple possible paths)
const tableToRouteMap = {
  'users': ['/users', '/users/:id'],
  'members': ['/members', '/members/:id'],
  'departments': ['/departments', '/departments/:id', '/departments/:slug'],
  'department': ['/departments', '/departments/:id'],
  'department_users': ['/departments/:id/members'],
  'department_categories': ['/department-categories'],
  'events': ['/events', '/events/:id'],
  'announcements': ['/announcements', '/announcements/:id', '/announcements/public'],
  'gallery_photos': ['/gallery/photos', '/gallery/photos/:id', '/gallery/albums/:albumId/photos'],
  'gallery_albums': ['/gallery/albums', '/gallery/albums/:id'],
  'gallery_categories': ['/gallery/categories'],
  'gallery_tags': ['/gallery/tags'],
  'gallery_comments': ['/gallery/photos/:photoId/comments'],
  'payments': ['/payments', '/payments/:id', '/payments/payments'],
  'payment_methods': ['/payments/methods'],
  'payment_categories': ['/payments/categories'],
  'pledges': ['/payments/pledges', '/payments/pledges/:id', '/treasury/pledges'],
  'sms_providers': ['/sms/providers'],
  'sms_templates': ['/sms/templates', '/sms/templates/:id'],
  'sms_logs': ['/sms/logs', '/sms/history'],
  'sms_campaigns': ['/sms/campaigns', '/sms/campaigns/:id'],
  'telegram_channels': ['/telegram/channels', '/telegram/channels/:id'],
  'telegram_settings': ['/telegram/settings'],
  'telegram_channel_posts': ['/telegram/channels/:id/posts'],
  'notifications': ['/notifications', '/notifications/:id'],
  'audit_logs': ['/audit-logs', '/audit-logs/:id'],
  'approval_requests': ['/approvals', '/approvals/:id'],
  'approval_workflows': ['/approvals/workflows'],
  'collections': ['/collections', '/collections/:id', '/collections/my-collections'],
  'documents': ['/documents', '/documents/:id'],
  'settings': ['/settings', '/settings/:key', '/settings/public'],
  'reports': ['/reports', '/reports/saved'],
  'accounts': ['/treasury/accounts', '/treasury/accounts/:id'],
  'transactions': ['/treasury/transactions', '/treasury/transactions/:id'],
  'budgets': ['/treasury/budgets', '/treasury/budgets/:budgetId'],
  'budget_items': ['/treasury/budgets/:budgetId/items'],
  'treasury_vendors': ['/treasury/vendors', '/treasury/vendors/:id'],
  'treasury_projects': ['/treasury/projects', '/treasury/projects/:id'],
  'treasury_pledges': ['/treasury/pledges', '/treasury/pledges/:id'],
  'treasury_campaigns': ['/treasury/campaigns'],
  'recurring_payments': ['/treasury/recurring-payments', '/treasury/recurring-payments/:id'],
  'receipts': ['/treasury/receipts', '/treasury/receipts/:id'],
  'comments': ['/comments/:entityType/:entityId'],
  'content': ['/content', '/content/:slug'],
  'content_items': ['/content'],
  'user_sessions': ['/auth/sessions', '/auth/sessions/:sessionId'],
  'user_roles': ['/users/:id/roles', '/users/:id/roles/:roleId'],
  'security_logs': ['/security/logs'],
  'security_settings': ['/security/settings'],
  'blocked_ips': ['/security/blocked-ips', '/security/blocked-ips/:ipAddress'],
  'failed_login_attempts': ['/security/failed-attempts'],
  'roles': ['/users/:id/roles'],
  'permissions': ['/users/:id/roles'],
  'refresh_tokens': ['/auth/refresh-token'],
  'password_reset_tokens': ['/auth/reset-password', '/auth/forgot-password'],
  'journal_entries': ['/treasury/journal-entries'],
  'journal_entry_lines': ['/treasury/journal-entries'],
  'funds': ['/treasury/funds'],
  'expenses': ['/treasury/expenses'],
  'expense_categories': ['/treasury/expense-categories'],
  'income_categories': ['/treasury/income-categories'],
  'fixed_assets': ['/treasury/fixed-assets'],
  'field_permissions': ['/field-permissions'],
  'member_groups': ['/members/groups'],
  'member_group_memberships': ['/members/groups'],
  'member_attendance': ['/members/attendance'],
  'event_attendance': ['/events/attendance'],
  'event_registrations': ['/events/registrations'],
  'department_meetings': ['/departments/:id/meetings'],
  'department_tasks': ['/departments/:id/tasks'],
  'department_resources': ['/departments/:id/resources'],
  'department_communications': ['/departments/:id/communications'],
  'department_members': ['/departments/:id/members'],
  'activity_feed': ['/activity-feed'],
  'activity_log': ['/activity-log'],
  'search': ['/search', '/search/global', '/search/saved'],
  'saved_searches': ['/search/saved'],
  'saved_reports': ['/reports/saved'],
  'scheduled_reports': ['/reports/scheduled'],
  'report_executions': ['/reports/scheduled/:reportId/executions'],
  'test_results': ['/testing/results'],
  'api_logs': ['/monitoring/logs'],
  'system_logs': ['/monitoring/logs'],
  'notification_preferences': ['/notifications/preferences'],
  'notification_types': ['/notifications/types'],
  'user_preferences': ['/user-settings/preferences'],
  'color_palettes': ['/palette'],
  'color_palette_colors': ['/palette'],
  'selected_palette': ['/palette'],
  'seo_settings': ['/seo/settings'],
  'accessibility_settings': ['/accessibility/settings'],
  'content_categories': ['/content/categories-list'],
  'content_tags': ['/content/tags'],
  'content_revisions': ['/content/revisions'],
  'content_item_tags': ['/content/tags'],
  'telegram_photos_cache': ['/telegram/cache/health'],
  'telegram_channel_media': ['/telegram/upload-photo'],
  'personal_collections': ['/collections/my-collections'],
  'collection_contributions': ['/collections/:id/contributions'],
  'event_collections': ['/collections/event'],
  'pledge_payments': ['/payments/pledges/:pledgeId/payments'],
  'pledge_campaigns': ['/treasury/campaigns'],
  'payment_items': ['/payments'],
  'refunds': ['/payments'],
  'department_permissions': ['/departments/:id/permissions'],
  'department_components': ['/departments/:id/components'],
  'department_component_allocations': ['/departments/:id/components'],
  'department_reports': ['/departments/:id/reports'],
  'department_meeting_attendees': ['/departments/:id/meetings'],
  'login_attempts': ['/security/failed-attempts'],
  'auth_audit_log': ['/auth/audit-log'],
  'settings_audit_log': ['/settings/history/audit'],
  'role_permissions': ['/users/:id/roles'],
  'approval_history': ['/approvals/:id/history'],
  'sms_template_versions': ['/sms/templates/:id/versions'],
  'sms_ab_tests': ['/sms/templates/:id/ab-tests'],
  'ticket_types': ['/support/tickets'],
  'member_contacts': ['/members/:id/contacts'],
  'church_accounts': ['/treasury/accounts'],
  'audit_log': ['/audit-logs'],
  'gallery_photo_tags': ['/gallery/photos/:photoId/tags'],
  'workflow_assignments': ['/approvals/workflows'],
  'vendors': ['/treasury/vendors'],
};

output += '### Tables with Likely Route Coverage\n\n';
output += '| Table | Likely Route | Has Route? |\n';
output += '|-------|--------------|-----------|\n';

let coveredCount = 0;
let uncoveredCount = 0;

sortedTables.forEach(([table, files]) => {
  const likelyRoutes = tableToRouteMap[table] || null;
  let hasRoute = false;
  let matchedRoute = null;
  
  if (likelyRoutes) {
    // Check if any of the likely routes exist
    for (const routePath of likelyRoutes) {
      const basePath = routePath.replace(/\/:id/g, '').replace(/\/:slug/g, '').replace(/\/:key/g, '').replace(/\/:sessionId/g, '').replace(/\/:budgetId/g, '').replace(/\/:albumId/g, '').replace(/\/:photoId/g, '').replace(/\/:entityType/g, '').replace(/\/:entityId/g, '').replace(/\/:pledgeId/g, '').replace(/\/:reportId/g, '').replace(/\/:roleId/g, '').replace(/\/:ipAddress/g, '').replace(/\/:channelId/g, '').replace(/\/:campaignId/g, '').replace(/\/:departmentId/g, '').replace(/\/:approvalId/g, '').replace(/\/:userId/g, '');
      
      if (allRoutes.some(r => r.path === basePath || r.path.startsWith(basePath) || basePath.startsWith(r.path.replace(/\/:id/g, '').replace(/\/:slug/g, '')))) {
        hasRoute = true;
        matchedRoute = routePath;
        break;
      }
    }
  }
  
  if (likelyRoutes) {
    if (hasRoute) {
      coveredCount++;
      output += `| \`${table}\` | \`${matchedRoute}\` | ✅ Yes |\n`;
    } else {
      uncoveredCount++;
      output += `| \`${table}\` | \`${likelyRoutes[0]}\` | ❌ No |\n`;
    }
  } else {
    uncoveredCount++;
    output += `| \`${table}\` | Unknown | ⚠️ No mapping |\n`;
  }
});

output += `\n**Covered:** ${coveredCount} | **Uncovered:** ${uncoveredCount}\n\n`;

// List tables without clear route mapping
output += '### Tables Without Clear Route Mapping\n\n';
const unmappedTables = sortedTables.filter(([table]) => !tableToRouteMap[table]);

if (unmappedTables.length > 0) {
  output += '| Table | Referenced In |\n';
  output += '|-------|--------------|\n';
  unmappedTables.forEach(([table, files]) => {
    output += `| \`${table}\` | ${files.slice(0, 2).join(', ')}${files.length > 2 ? '...' : ''} |\n`;
  });
} else {
  output += 'All tables have route mappings.\n';
}

output += '\n---\n\n';
output += '*This document is auto-generated by validate-db-routes.js*\n';

// Write output
const outputPath = path.join(__dirname, '../../docs/db-routes-validation.md');
fs.writeFileSync(outputPath, output);

console.log('Validation report generated:', outputPath);
console.log('Total tables:', sortedTables.length);
console.log('Covered:', coveredCount);
console.log('Uncovered:', uncoveredCount);
console.log('Unmapped:', unmappedTables.length);
