Modular Architecture Documentation
==================================

This folder contains the modular architecture documentation for the Kiserian Main SDA Church Website project.

CSV Files Reference
------------------

Overview Files
1. 01-module-overview.csv - Complete list of all modules with their type code database tables and purpose
2. 02-module-relationships.csv - Module dependency graph showing how modules interact

Individual Module Files (03-14)
Each module has its own detailed CSV file with:
- Module overview (code name type description)
- Database tables owned by the module
- Backend and frontend files
- API endpoints
- Acceptance criteria
- Detailed prompts for development

File | Module | Code
----|--------|-----
03-auth-module.csv | Authentication & Security | AUTH
04-telegram-module.csv | Telegram Channel Integration | TELEGRAM
05-content-module.csv | Website Content Management | CONTENT
06-departments-module.csv | Departments Management | DEPT
07-gallery-module.csv | Photo Gallery Management | GALLERY
08-treasury-module.csv | Treasury & Finance | TREASURY
09-payments-module.csv | Payments (M-Pesa/KopoKopo) | PAYMENT
10-sms-module.csv | SMS / BlessedTexts | SMS
11-documents-module.csv | Documents Management | DOC
12-approvals-module.csv | Approvals Workflow | APPROVAL
13-notifications-module.csv | Notifications System | NOTIF
14-settings-module.csv | Settings & Configuration | SETTINGS

Frontend & Process Files
15. 15-frontend-modules.csv - Frontend module breakdown (Dashboard Public Website Admin UI)
16. 16-version-control-procedures.csv - Git workflow and deployment procedures

Module Categories
-----------------

Core Modules (Foundation Layer)
- AUTH - Authentication security and user management
- TELEGRAM - Telegram Bot API integration for messaging and storage

Functional Modules (Business Logic)
- CONTENT - CMS announcements and website content
- DEPT - Department management and collaboration
- GALLERY - Photo gallery with Telegram integration
- TREASURY - Church finance accounting and budgeting
- PAYMENT - Online payments via M-Pesa/KopoKopo
- SMS - SMS messaging via BlessedTexts
- DOC - Document management and sharing
- APPROVAL - Multi-level approval workflows
- NOTIF - In-app and push notifications
- SETTINGS - System configuration and maintenance

Frontend Modules (Presentation Layer)
- DASHUI - Dashboard interface and navigation
- WEBUI - Public-facing website
- ADMINUI - Administrative interface

Using These CSV Files
---------------------

Opening in Excel
1. Open Excel
2. Go to Data -> Get Data -> From File -> From Text/CSV
3. Select the CSV file
4. Choose "Comma" as delimiter
5. Click Load

Using with Other Tools
These CSV files can be imported into:
- Google Sheets (File -> Import)
- Notion (Create database from CSV)
- Airtable (Add records from CSV)
- Custom project management tools

Workspace Rules
---------------

The .windsurfrules file in the project root contains enforcement rules for:
- Module isolation boundaries
- Database access restrictions
- API contract requirements
- Forbidden patterns to avoid
- Code review checklists

Key Principles
---------------

1. Single Responsibility - Each module owns its data and logic
2. API-First Communication - Modules communicate via documented APIs only
3. No Direct Access - Never access another module's database tables directly
4. Test Isolation - Each module can be tested independently
5. Version Control - Follow branch naming and commit conventions

Development Workflow
--------------------

1. Identify the module you need to work on
2. Open the corresponding CSV file for that module
3. Review the API endpoints and acceptance criteria
4. Follow the prompts in the CSV for implementation guidance
5. Ensure all changes respect module boundaries
6. Update tests and documentation

For Questions or Updates
------------------------

Contact the technical team lead to update these architecture documents when:
- New modules are added
- API contracts change
- Module boundaries need adjustment
- New patterns are established
