# Smart Expense Tracker 💰

A modern, AI-powered expense tracking application built with Next.js, featuring intelligent receipt scanning, recurring transactions, and comprehensive financial analytics.

## ✨ Features

### 📊 Transaction Management
- **Manual Entry**: Add income and expense transactions with detailed categorization
- **AI Receipt Scanning**: Upload receipt images and let AI extract transaction details automatically
- **Bulk Import**: Import transactions from various sources
- **Advanced Filtering**: Filter by date, category, type, and search by merchant or notes

### 🔄 Recurring Transactions
- **Automated Rules**: Set up recurring transactions with flexible frequencies (daily, weekly, monthly, yearly)
- **AI-Powered Setup**: Scan documents to automatically create recurring rules
- **Smart Processing**: Automatic transaction generation based on your recurring rules
- **Easy Management**: Enable/disable, edit, or delete recurring rules anytime

### 📈 Analytics & Reports
- **Visual Dashboards**: Interactive charts powered by Recharts
- **Spending Insights**: Track expenses by category, time period, and merchant
- **Income Analysis**: Monitor income sources and trends
- **Custom Reports**: Generate detailed financial reports

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Mode**: System-aware theme switching
- **Internationalization**: Multi-language support (English & Chinese)
- **Beautiful Icons**: Lucide React icon library
- **Smooth Animations**: Enhanced user experience with Tailwind CSS

### 🔧 Category Management
- **Custom Categories**: Create and organize your own expense/income categories
- **Icon Selection**: Choose from a wide variety of icons
- **Default Categories**: Pre-configured common categories
- **Type-Based Organization**: Separate expense and income categories

### 💰 Investment & Assets
- **Portfolio Tracking**: Monitor stocks, funds, and other investments
- **Fixed Assets**: Track physical assets (electronics, vehicles, etc.)
- **Smart Depreciation**:
  - **Automated Amortization**: Automatically calculate and record depreciation expenses
  - **Multiple Methods**: Support for Straight-Line and Declining Balance methods
  - **Real-time Valuation**: Track current book value vs market value
- **Asset Lifecycle**: Manage asset purchase, depreciation, and disposal/redemption

### 🏦 Advanced Account Management
- **Multi-Type Support**: Bank accounts, digital wallets, credit cards, and asset accounts
- **AI Transfers**: Intelligent detection of transfers between accounts
- **Balance Reconciliation**: Track and adjust account balances
- **Asset Integration**: Seamlessly link assets to financial accounts

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- Node.js 20+ (for local development without Docker)

### One-Click Startup with Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd accounting

# Start the entire stack
docker-compose up --build
```

The application will be available at `http://localhost:3000`

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Set up the database
docker-compose up postgres -d

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: Custom components with Lucide React icons
- **Charts**: [Recharts 3](https://recharts.org/)
- **State Management**: [Zustand 5](https://zustand-demo.pmnd.rs/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Date Handling**: [date-fns 4](https://date-fns.org/)

### Backend
- **Database**: [PostgreSQL 15](https://www.postgresql.org/)
- **ORM**: [Prisma 7](https://www.prisma.io/)
- **Database Adapter**: @prisma/adapter-pg
- **API**: Next.js Server Actions

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database Management**: Prisma migrations
- **Linting**: ESLint 9

## 📁 Project Structure

```
accounting/
├── app/                      # Next.js App Router
│   ├── actions/             # Server actions
│   │   ├── category.ts      # Category CRUD operations
│   │   ├── recognize.ts     # AI receipt scanning
│   │   ├── recognizeRecurring.ts  # AI recurring rule setup
│   │   ├── recurring.ts     # Recurring rules management
│   │   ├── settings.ts      # App settings
│   │   └── transaction.ts   # Transaction operations
│   ├── add/                 # Add transaction page
│   ├── categories/          # Category management
│   ├── edit/                # Edit transaction page
│   ├── investments/         # Investment portfolio
│   ├── recurring/           # Recurring rules page
│   ├── reports/             # Analytics & reports
│   ├── settings/            # Settings page
│   ├── transactions/        # Transaction list
│   └── page.tsx            # Dashboard/home page
├── components/              # Reusable React components
│   ├── layout/             # Layout components
│   ├── ui/                 # UI components
│   └── ...
├── lib/                     # Utility libraries
│   ├── db.ts               # Prisma client
│   ├── i18n.ts             # Internationalization
│   └── utils.ts            # Helper functions
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration files
├── types/                   # TypeScript type definitions
├── docker-compose.yml       # Docker services configuration
├── Dockerfile              # Application container
└── package.json            # Dependencies & scripts
```

## 🗄️ Database Schema

### Models
- **Transaction**: Individual income/expense records
- **Category**: Transaction categories with icons
- **RecurringRule**: Automated recurring transaction rules
- **Investment**: Asset and investment tracking
- **Account**: Financial accounts (Bank, Cash, Wallet)
- **User**: User authentication and profile
- **Settings**: Application configuration

See [`prisma/schema.prisma`](prisma/schema.prisma) for detailed schema definition.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory to configure the application and set secure passwords.

> [!IMPORTANT]
> **Security Warning**: Change the default passwords below before deploying to production!

```env
# Database Credentials (for Docker)
POSTGRES_USER=user
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=accounting

# App Authentication


# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Database Connection String (Required for local development only)
# If using Docker, this is automatically constructed from the variables above.
DATABASE_URL="postgresql://user:change_this_password@localhost:5432/accounting"
```

### AI Integration

Configure AI settings in the Settings page:
- API Base URL
- API Key
- Model selection (GPT-4o, etc.)

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server

# Database
npx prisma migrate dev    # Run migrations in development
npx prisma migrate deploy # Deploy migrations in production
npx prisma studio         # Open Prisma Studio GUI

# Code Quality
npm run lint         # Run ESLint
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Rebuild containers
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Access database
docker exec -it accounting_db psql -U user -d accounting
```

## 🌐 Internationalization

The app supports multiple languages:
- English (en)
- Chinese (zh)

Language can be changed in the Settings page.

## 🎨 Theme

The application supports three theme modes:
- Light
- Dark
- System (follows OS preference)

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

## 🔮 Future Enhancements

- [ ] Export transactions to CSV/Excel
- [ ] Budget tracking and alerts
- [ ] Multi-currency support with exchange rates
- [ ] Mobile app (React Native)
- [ ] Bank account integration
- [ ] Advanced reporting and forecasting
- [ ] User authentication and multi-user support

## 📞 Support

For support or questions, please contact the development team.

---

Built with ❤️ using Next.js and modern web technologies

---

# 🧠 Advanced Architecture & Database Design

This section outlines the technical details of the application's architecture, intended for developers and contributors who need a deeper understanding of the system.

## 🗄️ Database Architecture (ERD)

The application uses a relational database model (PostgreSQL) managed by Prisma ORM. The schema is designed to support multi-user environments (though currently single-tenant focused), multi-currency transactions, and complex financial tracking.

### Core Entities

#### 1. User (`users`)
The central entity for authentication and data ownership.
- **Key Fields**: `id`, `email`, `password` (hashed), `role`.
- **Relationships**: Owns all other entities (Transactions, Accounts, Investments, etc.) via `userId`.
- **Security**: All data queries are scoped to the `userId` to ensure data isolation.

#### 2. Account (`accounts`)
Represents a financial container (e.g., Bank Account, Wallet, Credit Card).
- **Key Fields**: `type` (BANK, CASH, etc.), `currencyCode`, `initialBalance`.
- **Design**: Acts as the source or destination for transactions.
- **Balance Calculation**: Current balance is derived from `initialBalance` + sum of all related transactions.

### Financial Records

#### 3. Transaction (`transactions`)
The core ledger entry for the application.
- **Types**: `EXPENSE`, `INCOME`, `TRANSFER`.
- **Double-Entry Support**:
  - `accountId`: The source account.
  - `transferToAccountId`: The destination account (for transfers).
- **Multi-Currency**: Stores `amount` (source currency) and `targetAmount` (destination currency) along with exchange rates.
- **Linkages**: Can be linked to an `Investment` via `investmentId` to track capital flow.

#### 4. Investment (`investments`)
A specialized module for tracking assets that appreciate or depreciate over time.
- **Types**: `STOCK`, `FUND`, `DEPOSIT`, `ASSET`.
- **Lifecycle**: Tracks `startDate`, `endDate`, `initialAmount`, and `currentAmount`.
- **Advanced Features**:
  - **Depreciation**: Supports `STRAIGHT_LINE` and `DECLINING_BALANCE` methods for fixed assets.
  - **Interest**: Tracks interest rates for deposits.

#### 5. RecurringRule (`recurring_rules`)
Automation engine for generating transactions.
- **Logic**: Defines `frequency` (e.g., MONTHLY) and `interval` (e.g., every 2 months).
- **State**: Tracks `nextRunDate` and `lastRunDate` to prevent duplicate generation.

### Configuration & Metadata

#### 6. Category (`categories`)
User-defined classification for transactions.
- **Fields**: `name`, `icon`, `type` (EXPENSE/INCOME).

#### 7. Settings (`settings`)
User-specific application configuration.
- **AI Config**: Stores API keys and model preferences for receipt scanning.
- **Preferences**: Default currency, language, and theme.

## 🔄 Data Flow & Logic

### Transaction Processing
1.  **Creation**: When a transaction is created, it is validated against the user's account and category.
2.  **Transfers**: For transfers, the system ensures both source and destination accounts exist. Currency conversion is handled if accounts differ in currency.
3.  **Balance Updates**: Account balances are not stored persistently to avoid drift. They are calculated dynamically or cached (future optimization).

### AI Integration
- **Receipt Scanning**: Images are sent to an LLM (e.g., GPT-4o) via the configured API. The LLM extracts date, amount, merchant, and items, returning a structured JSON.
- **Recurring Rules**: Similar to receipts, documents can be scanned to infer recurring payment schedules.

### Internationalization (i18n)
- The app uses a custom i18n solution (or library) to handle English and Chinese.
- Dates and currencies are formatted based on the user's locale settings.

