# SaludK Backend

A backend API service built with Node.js and Express for the SaludK platform.

## 📋 Table of Contents

- [About](#about)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

SaludK Backend is a RESTful API service that provides the backend infrastructure for the SaludK application. It handles data management, business logic, and provides endpoints for client applications.

## 🛠️ Technology Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: Using Cockroach DB
- **Authentication**: Cookies + JWT 
- **Validation**: Joi Validation
- **Environment Variables**: dotenv
- **Logging**: Morgan and Wiston

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.x or higher recommended)
- **npm** (v6.x or higher) or **yarn**
- **Git**
- Database system (if applicable)

To check your current versions:

```bash
node --version
npm --version
```

## 🚀 Installation

1. **Clone the repository**

```bash
git clone https://github.com/AndresPatarroyo1517/saludk-backend.git
cd saludk-backend
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

## ⚙️ Configuration

1. **Create environment variables file**

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

2. **Configure environment variables**

Edit the `.env` file with your configuration:

```env
NODE_ENV=production
PORT=3000
API_VERSION=v1

# ==========================================
# CockroachDB
# ==========================================

DB_USERNAME=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=...
DB_NAME=...

REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
REDIS_NODE=..

JWT_ACCESS_SECRET=....
JWT_REFRESH_SECRET=...

# ==========================================
# STORJ (Files storage)
# ==========================================
STORJ_ENDPOINT=...
STORJ_ACCESS_KEY_ID=...
STORJ_SECRET_ACCESS_KEY=...
STORJ_BUCKET_NAME=...

# ==========================================
# STRIPE (Pagos)
# ==========================================
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PUBLIC_KEY=...

BANCO_CONSIGNACION=Bancolombia
CUENTA_BANCARIA=1234567890
TIPO_CUENTA=AHORROS

# ==========================================
# NODEMAILER (Emails)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
EMAIL_FROM=noreply@saludk.com

# ==========================================
# TWILIO (SMS - Opcional)
# ==========================================
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=..
TWILIO_PHONE_NUMBER=...

# ==========================================
# RATE LIMITING (RNF002)
# ==========================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# CIFRADO (RNF001)
# ==========================================
ENCRYPTION_KEY=.....
ENCRYPTION_ALGORITHM=aes-256-gcm

# ==========================================
# FRONTEND URL (CORS)
# ==========================================
FRONTEND_URL=http://localhost:4000

# ==========================================
# APIS EXTERNAS (HU-04 - MOCKS)
# =========================================
EXTERNAL_API_BD_NACIONAL=https://api-mock.saludk.com/bd-nacional
EXTERNAL_API_ANTECEDENTES=https://api-mock.saludk.com/policia
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

The server will start with hot-reloading enabled, typically on `http://localhost:3000`

### Production Mode

```bash
npm start
# or
yarn start
```

## 📁 Project Structure

```
saludk-backend/
│
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers (business logic)
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middleware functions
│   ├── utils/           # Utility functions and helpers
│   ├── services/        # Business logic services
│   └── app.js           # Express app setup
│
├── tests/               # Test files
├── docs/                # Documentation
├── .env.example         # Example environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

#### Health Check

```
GET /health
```

Returns the status of the API.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Authentication

[To be documented]

### User Endpoints

[To be documented]

### Additional Resources

- Full API documentation available at `/api/docs` (when Swagger/OpenAPI is configured)

## 🔧 Development

### Code Style

This project follows JavaScript/Node.js best practices and coding standards.

**Linting**

```bash
npm run lint
# or
yarn lint
```

**Code Formatting**

```bash
npm run format
# or
yarn format
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name
```

### Debugging

For debugging, you can use:

```bash
npm run debug
# or
node --inspect src/app.js
```

Then attach your debugger (Chrome DevTools, VS Code, etc.)

## 🧪 Testing

### Run all tests

```bash
npm test
# or
yarn test
```

### Run tests with coverage

```bash
npm run test:coverage
# or
yarn test:coverage
```

### Run specific test file

```bash
npm test -- path/to/test/file.test.js
```

## 🚢 Deployment

### Docker

```bash
# Build the Docker image
docker build -t saludk-backend .

# Run the container
docker run -p 3000:3000 saludk-backend
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Cloud Platforms

This application can be deployed to:

- **Heroku**
- **AWS** (EC2, ECS, Elastic Beanstalk)
- **Google Cloud Platform**
- **Azure**
- **Vercel**

Refer to the respective platform documentation for deployment instructions.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Guidelines

- Write clear, descriptive commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Andres Patarroyo** - [AndresPatarroyo1517](https://github.com/AndresPatarroyo1517)

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🙏 Acknowledgments

- Express.js community
- Node.js community
- All contributors who help improve this project

---

**Note**: This is a work in progress. Documentation will be updated as the project evolves.
