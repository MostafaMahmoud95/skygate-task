# VM Platform Microservices (Monorepo)

This repository contains **two NestJS microservices**:

- **Auth Service** (`auth-service`) — handles user registration, login, and JWT authentication.
- **Billing Service** (`billing-service`) — manages user wallets, credit, and transactions.

> Currently, the Auth Service calls the Billing Service via HTTP on port `3002`.  
> Auth Service runs on port `3001`.

---

---

## Prerequisites

- Node.js >= 18
- npm
- MySQL 8+
- Git

---

## Database Setup

1. Start MySQL and create the two databases:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE billing_db;
```

Update .env in each service with the corresponding DB URL:

Auth Service .env:

DATABASE_URL="mysql://user:password@localhost:3306/auth_db"
JWT_SECRET="your_jwt_secret"
REFRESH_TOKEN_SECRET="your_refresh_secret"
ACCESS_TOKEN_EXPIRES_IN=900
REFRESH_TOKEN_EXPIRES_IN=604800
BILLING_URL="http://localhost:3002"

Billing Service .env:

DATABASE_URL="mysql://user:password@localhost:3306/billing_db"

# Auth Service

cd services/auth-service
npx prisma migrate dev --name init_auth

# Billing Service

cd ../billing-service
npx prisma migrate dev --name init_billing

# Billing Service

cd services/billing-service
npm install
npm run start:dev

# Auth Service

cd ../auth-service
npm install
npm run start:dev

Auth Service: http://localhost:3001
Billing Service: http://localhost:3002

1. Register a new user
   curl -X POST http://localhost:3001/auth/register \
    -H "Content-Type: application/json" \
    -d '{
   "email": "user@example.com",
   "password": "Secret123!"
   }'

Response:

{
"user": { "id": "<USER_ID>", "email": "user@example.com" },
"tokens": { "accessToken": "...", "refreshToken": "..." }
}

2. Login
   curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{
   "email": "user@example.com",
   "password": "Secret123!"
   }'

Response:

{
"accessToken": "...",
"refreshToken": "..."
}

3. Refresh Token
   curl -X POST http://localhost:3001/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{
   "refreshToken": "<REFRESH_TOKEN>"
   }'

Response:

{
"accessToken": "...",
"refreshToken": "..."
}

Billing Service (Port 3002)

1. Initialize Wallet
   curl -X POST http://localhost:3002/wallet/init \
    -H "Content-Type: application/json" \
    -d '{
   "userId": "<USER_ID>"
   }'

Response:

{
"walletId": "<WALLET_ID>",
"userId": "<USER_ID>",
"balance": "0"
}

2. Credit Wallet
   curl -X POST http://localhost:3002/wallet/credit \
    -H "Content-Type: application/json" \
    -d '{
   "userId": "<USER_ID>",
   "amount": 50
   }'

Response:

{
"success": true,
"txnId": "<TRANSACTION_ID>"
}

3. Get Wallet Balance
   curl "http://localhost:3002/wallet/balance?userId=<USER_ID>"

Response:

{
"balance": "50"
}

4. Charge Wallet (Debit)
   curl -X POST http://localhost:3002/wallet/charge \
    -H "Content-Type: application/json" \
    -d '{
   "userId": "<USER_ID>",
   "amount": 10,
   "operationId": "op-1"
   }'

Response:

{
"txnId": "<TRANSACTION_ID>",
"status": "pending"
}

5. Complete Transaction
   curl -X POST http://localhost:3002/txns/complete \
    -H "Content-Type: application/json" \
    -d '{
   "txnId": "<TRANSACTION_ID>"
   }'

Response:

{
"success": true,
"txn": { ...transaction details... }
}

6. Refund Transaction
   curl -X POST http://localhost:3002/txns/refund \
    -H "Content-Type: application/json" \
    -d '{
   "txnId": "<TRANSACTION_ID>"
   }'

Response:

{
"success": true
}
