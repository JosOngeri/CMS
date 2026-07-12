/**
 * Script to check for missing repository methods
 * Compares methods called in controllers with methods implemented in repositories
 */

const fs = require('fs');
const path = require('path');

const repositoriesDir = path.join(__dirname, '../repositories');
const controllersDir = path.join(__dirname, '../controllers');

// Function to extract method names from a file
function extractMethods(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const methods = [];
  
  // Match async function declarations
  const asyncFunctionRegex = /async\s+(\w+)\s*\(/g;
  let match;
  while ((match = asyncFunctionRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Match regular function declarations
  const functionRegex = /function\s+(\w+)\s*\(/g;
  while ((match = functionRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Match arrow function assignments
  const arrowRegex = /(\w+)\s*=\s*(?:async\s+)?\(/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  return [...new Set(methods)]; // Remove duplicates
}

// Function to extract Repository method calls from controllers
function extractRepositoryCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const calls = [];
  
  // Match Repository.methodName patterns
  const repositoryRegex = /(\w+Repository)\.(\w+)\(/g;
  let match;
  while ((match = repositoryRegex.exec(content)) !== null) {
    calls.push({
      repository: match[1],
      method: match[2]
    });
  }
  
  return calls;
}

// Map repository names to file names
const repositoryNameToFile = {
  'AccessibilityRepository': 'AccessibilityRepository.js',
  'accountingExportRepository': 'AccountingExportRepository.js',
  'activityFeedRepository': 'ActivityFeedRepository.js',
  'AIRepository': 'AIRepository.js',
  'AnalyticsRepository': 'AnalyticsRepository.js',
  'AnnouncementsRepository': 'AnnouncementsRepository.js',
  'ApprovalsRepository': 'ApprovalsRepository.js',
  'AuthRepository': 'AuthRepository.js',
  'BudgetsRepository': 'BudgetsRepository.js',
  'ChartOfAccountsRepository': 'ChartOfAccountsRepository.js',
  'ChatRepository': 'ChatRepository.js',
  'ChurchRepository': 'ChurchRepository.js',
  'CollectionRepository': 'CollectionRepository.js',
  'CommentsRepository': 'CommentsRepository.js',
  'ContentRepository': 'ContentRepository.js',
  'customReportRepository': 'CustomReportRepository.js',
  'DashboardRepository': 'DashboardRepository.js',
  'DepartmentCategoriesRepository': 'DepartmentCategoriesRepository.js',
  'DepartmentFeaturesRepository': 'DepartmentFeaturesRepository.js',
  'DepartmentRepository': 'DepartmentRepository.js',
  'DepartmentsRepository': 'DepartmentsRepository.js',
  'DocumentationRepository': 'DocumentationRepository.js',
  'DocumentsRepository': 'DocumentsRepository.js',
  'DocumentVersionsRepository': 'DocumentVersionsRepository.js',
  'EventsRepository': 'EventsRepository.js',
  'FinancialAlertsRepository': 'FinancialAlertsRepository.js',
  'FinancialForecastingRepository': 'FinancialForecastingRepository.js',
  'FixedAssetsRepository': 'FixedAssetsRepository.js',
  'GalleryAlbumsRepository': 'GalleryAlbumsRepository.js',
  'GalleryRepository': 'GalleryRepository.js',
  'GatewayRepository': 'GatewayRepository.js',
  'JournalEntryRepository': 'JournalEntryRepository.js',
  'ManualPaymentRepository': 'ManualPaymentRepository.js',
  'MemberGivingRepository': 'MemberGivingRepository.js',
  'MembersRepository': 'MembersRepository.js',
  'MobileRepository': 'MobileRepository.js',
  'MonitoringRepository': 'MonitoringRepository.js',
  'MpesaRepository': 'MpesaRepository.js',
  'NotificationsRepository': 'NotificationsRepository.js',
  'PaletteRepository': 'PaletteRepository.js',
  'PaymentRepository': 'PaymentRepository.js',
  'PaymentsRepository': 'PaymentsRepository.js',
  'PerformanceRepository': 'PerformanceRepository.js',
  'PledgesRepository': 'PledgesRepository.js',
  'ProjectsRepository': 'ProjectsRepository.js',
  'ReconciliationRepository': 'ReconciliationRepository.js',
  'RecurringPaymentsRepository': 'RecurringPaymentsRepository.js',
  'ReportsRepository': 'ReportsRepository.js',
  'SearchRepository': 'SearchRepository.js',
  'SecurityRepository': 'SecurityRepository.js',
  'SEORepository': 'SEORepository.js',
  'SettingsRepository': 'SettingsRepository.js',
  'SmsAutomationRepository': 'SmsAutomationRepository.js',
  'SMSProviderRepository': 'SMSProviderRepository.js',
  'SMSRepository': 'SMSRepository.js',
  'SocialAuthRepository': 'SocialAuthRepository.js',
  'SyncRepository': 'SyncRepository.js',
  'TaxStatementRepository': 'TaxStatementRepository.js',
  'TelegramAuthRepository': 'TelegramAuthRepository.js',
  'TelegramRepository': 'TelegramRepository.js',
  'TestingRepository': 'TestingRepository.js',
  'TreasuryDashboardRepository': 'TreasuryDashboardRepository.js',
  'TreasuryRepository': 'TreasuryRepository.js',
  'UserRepository': 'UserRepository.js',
  'UserSettingsRepository': 'UserSettingsRepository.js',
  'UsersRepository': 'UsersRepository.js',
  'VendorsRepository': 'VendorsRepository.js'
};

// Collect all repository method calls
const allCalls = {};
const controllerFiles = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.js') && file !== 'BaseController.js');

controllerFiles.forEach(controllerFile => {
  const controllerPath = path.join(controllersDir, controllerFile);
  const calls = extractRepositoryCalls(controllerPath);
  
  calls.forEach(call => {
    if (!allCalls[call.repository]) {
      allCalls[call.repository] = new Set();
    }
    allCalls[call.repository].add(call.method);
  });
});

// Check each repository for missing methods
console.log('=== Missing Repository Methods ===\n');

Object.keys(allCalls).forEach(repositoryName => {
  const fileName = repositoryNameToFile[repositoryName];
  if (!fileName) {
    console.log(`⚠️  Unknown repository: ${repositoryName}`);
    return;
  }
  
  const repositoryPath = path.join(repositoriesDir, fileName);
  if (!fs.existsSync(repositoryPath)) {
    console.log(`❌ Repository file not found: ${fileName}`);
    return;
  }
  
  const implementedMethods = extractMethods(repositoryPath);
  const calledMethods = allCalls[repositoryName];
  
  const missingMethods = [...calledMethods].filter(method => !implementedMethods.includes(method));
  
  if (missingMethods.length > 0) {
    console.log(`\n${repositoryName} (${fileName}):`);
    missingMethods.forEach(method => {
      console.log(`  ❌ Missing: ${method}()`);
    });
  } else {
    console.log(`✅ ${repositoryName}: All methods implemented`);
  }
});

console.log('\n=== Analysis Complete ===');