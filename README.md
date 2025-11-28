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
