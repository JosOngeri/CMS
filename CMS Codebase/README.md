# KMainCMS - Kiserian Main SDA Church Website

Modular church management system built with clean architecture principles.

## Project Structure

```
KMainCMS/
├── backend/              # Node.js/Express API
│   ├── config/          # Configuration files
│   ├── controllers/     # Module controllers
│   ├── helpers/         # Utility functions
│   ├── middleware/      # Express middleware
│   ├── migrations/      # Database migrations
│   ├── modules/         # Domain modules (treasury, etc.)
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── scripts/         # Utility and setup scripts
│   ├── services/        # External service integrations
│   ├── tests/           # Test files
│   └── utils/           # Utility functions
├── frontend/            # React/Vite frontend
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # Reusable components
│       ├── contexts/    # React contexts
│       ├── layouts/     # Layout components
│       ├── modules/     # Feature modules
│       ├── pages/       # Page components by module
│       └── router/      # Route configuration
├── mobile/              # Mobile applications
│   ├── flutter/         # Flutter mobile app
│   └── react-native/    # React Native mobile app
├── database/            # SQL migration files
├── docs/                # Documentation
│   ├── api/             # API documentation
│   ├── architecture/    # System architecture docs
│   ├── deployment/      # Deployment guides
│   ├── development/     # Developer guides
│   ├── logs/            # Session logs
│   ├── modular-architecture/  # Module documentation
│   ├── planning/        # Implementation plans
│   └── reports/         # Audit and progress reports
├── assets/              # Static assets
│   ├── icons/           # Brand icons and logos
│   └── releases/        # Mobile app releases (APKs)
├── services/            # Microservices
└── .gitignore, package.json, README.md
```

## Modules

See `docs/modular-architecture/` for detailed module documentation.

## Getting Started

See [STARTING_INSTRUCTIONS.md](./STARTING_INSTRUCTIONS.md) for a detailed step-by-step setup guide.

### Quick Start (Development)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Mobile (Flutter)
```bash
cd mobile/flutter
flutter pub get
flutter run
```

### Mobile (React Native)
```bash
cd mobile/react-native
npm install
npx expo start
```

## Architecture Principles

- **Module Isolation**: Each module owns its data and logic
- **API-First**: Modules communicate via documented APIs
- **No Direct Access**: Never access another module's database directly
- **Test Isolation**: Each module can be tested independently

## Development Workflow

1. Identify the module you need to work on
2. Follow the module-specific prompts in docs/modular-architecture/
3. Respect module boundaries defined in .windsurfrules
4. Update tests and documentation

## Documentation

- **API Documentation**: `docs/api/`
- **Architecture**: `docs/architecture/`
- **Deployment**: `docs/deployment/`
- **Developer Guide**: `docs/development/`
- **Session Logs**: `docs/logs/`
- **Module Docs**: `docs/modular-architecture/`
- **Implementation Plans**: `docs/planning/`
- **Reports**: `docs/reports/`

## License

MIT
