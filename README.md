# GoCarry Server 🚚

Backend API for **GoCarry**, a parcel delivery and logistics platform that connects customers, riders, and administrators through a secure and scalable RESTful API.

The server is built with **Node.js, Express.js, MongoDB, Firebase Authentication, and Stripe**. It provides APIs for parcel management, rider applications, user management, payments, tracking, and role-based access control.

---

## 🚀 Live Project

- **Live URL:** [GoCarry Server]()

---

## 📌 Project Overview

GoCarry is a modern parcel delivery platform designed to simplify the process of sending, receiving, tracking, and managing parcels.

The backend handles:

- User authentication and authorization
- Customer management
- Parcel creation and management
- Delivery cost calculation
- Rider applications
- Rider management
- Parcel assignment
- Parcel status updates
- Delivery tracking
- Stripe payment processing
- Admin operations
- Role-based API protection
- Firebase token verification

---

## ✨ Key Features

### 🔐 Authentication & Authorization

- Firebase Authentication integration
- Firebase ID token verification
- Protected API routes
- Role-based authorization
- User registration
- User login tracking
- Admin authorization
- Rider authorization
- Secure Bearer token authentication

### 📦 Parcel Management

- Create new parcels
- Retrieve user-specific parcels
- Retrieve parcel details
- Update parcel information
- Update parcel delivery status
- Cancel/manage parcel workflows
- Store sender and receiver information
- Store pickup and delivery locations
- Track parcel creation time

### 💳 Payment System

- Stripe payment integration
- Secure payment API
- Payment intent creation
- Payment status tracking
- Payment history
- Parcel-payment relationship
- Store Stripe payment intent ID
- Store payment date and amount

### 🏍️ Rider Management

- Rider application system
- Rider profile information
- Rider status management
- Admin approval/rejection
- Rider verification
- Rider-specific protected routes
- Parcel assignment
- Delivery status updates

### 📍 Parcel Tracking

- Track parcel progress
- Store tracking updates separately
- Record delivery status
- Store tracking timestamps
- Maintain parcel delivery history

### 👤 User Management

- Store user information
- Firebase UID integration
- User roles
- Profile information
- Account creation timestamp
- Last login tracking
- Admin user management

### 🛡️ Security

- Firebase token verification
- Admin middleware
- Rider middleware
- Protected routes
- Environment variables
- CORS configuration
- Server-side validation
- Secure API architecture

---

# 🛠️ Technologies Used

## Backend

- Node.js
- Express.js
- MongoDB
- MongoDB Native Driver
- Firebase Admin SDK
- Stripe
- dotenv
- cors

## Authentication

- Firebase Authentication
- Firebase Admin SDK
- Bearer Token
- Firebase Access/ID Token verification

## Development Tools

- Git
- GitHub
- VS Code
- Postman
- npm

---

# 📁 Project Structure

```text
gocarry-server/
│
├── .env
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
├── README.md
│
├── config/
│   └── firebase-admin.js
│
├── middleware/
│   ├── verifyFBToken.js
│   ├── verifyAdmin.js
│   └── verifyRider.js
│
├── routes/
│   ├── users.js
│   ├── parcels.js
│   ├── riders.js
│   ├── payments.js
│   └── tracking.js
│
└── utils/
    └── helpers.js
```

> The exact folder structure may vary depending on how the project is organized.

---

# ⚙️ Installation & Setup

## 1. Clone the Repository

```bash
git clone <https://github.com/tushar-hossain/GoCarry-server-side>
```

Move into the project directory:

```bash
cd GoCarry-server-side
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string
DB_NAME=gocarry

STRIPE_SECRET_KEY=your_stripe_secret_key

FB_SERVICE_KEY=your_firebase_service_account_configuration

CLIENT_URL=http://localhost:5173
```

### Environment Variables

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `PORT`              | Server port                              |
| `MONGODB_URI`       | MongoDB connection string                |
| `DB_NAME`           | MongoDB database name                    |
| `STRIPE_SECRET_KEY` | Stripe secret API key                    |
| `FB_SERVICE_KEY`    | Firebase Admin credentials/configuration |
| `CLIENT_URL`        | Frontend application URL                 |

> Never commit `.env`, Firebase private keys, Stripe secret keys, or other credentials to GitHub.

---

# 🔥 Firebase Authentication

GoCarry uses **Firebase Authentication** on the client side.

After authentication, the client sends the Firebase token with protected API requests.

Example:

```http
Authorization: Bearer FIREBASE_ACCESS_TOKEN
```

The server verifies the token using Firebase Admin SDK.

---

## Authentication Flow

```text
User
 │
 ▼
Firebase Authentication
 │
 ▼
Firebase Token
 │
 ▼
GoCarry Client
 │
 │ Authorization: Bearer Token
 ▼
GoCarry Server
 │
 ▼
Firebase Admin SDK
 │
 ▼
Token Verification
 │
 ▼
Protected API
```

This prevents unauthorized users from accessing protected resources.

---

# 🛡️ Middleware

## Firebase Token Verification

The `verifyFBToken` middleware validates the Firebase authentication token.

Example:

```js
app.get("/parcels", verifyFBToken, async (req, res) => {
  // Protected API
});
```

---

## Admin Verification

Admin-only APIs use an additional authorization layer.

```js
app.delete("/users/:id", verifyFBToken, verifyAdmin, async (req, res) => {
  // Admin operation
});
```

---

## Rider Verification

Rider-specific APIs can use rider authorization middleware.

```js
app.patch(
  "/riders/status/:id",
  verifyFBToken,
  verifyRider,
  async (req, res) => {
    // Rider operation
  },
);
```

---

# 🗄️ Database

GoCarry uses **MongoDB** with the native MongoDB driver.

Database:

```text
gocarry
```

Main collections:

```text
users
parcels
payments
riders
tracking
```

---

# 👤 Users Collection

Example user document:

```js
{
  uid: "firebase-user-uid",
  email: "user@example.com",
  name: "User Name",
  role: "user",
  createdAt: new Date(),
  last_Login: new Date()
}
```

### User Roles

```text
user
rider
admin
```

The role determines which protected APIs a user can access.

---

# 📦 Parcels Collection

A parcel contains information about the shipment, sender, receiver, cost, payment status, and delivery status.

Example:

```js
{
  parcelType: "non-document",
  title: "Electronics",
  weight: 2,

  sender: {
    name: "Sender Name",
    contact: "017XXXXXXXX",
    region: "Dhaka",
    serviceCenter: "Dhaka Center",
    address: "Sender Address",
    pickupInstruction: "Call before pickup"
  },

  receiver: {
    name: "Receiver Name",
    contact: "018XXXXXXXX",
    region: "Chittagong",
    serviceCenter: "Chittagong Center",
    address: "Receiver Address",
    deliveryInstruction: "Deliver during daytime"
  },

  deliveryCost: 150,

  paymentStatus: "unpaid",
  deliveryStatus: "pending",

  created_by: "user@example.com",
  createdAt: new Date()
}
```

---

# 💳 Payments Collection

Example:

```js
{
  paymentIntentId: "pi_xxxxxxxxx",
  parcelId: "parcel-id",
  amount: 150,
  currency: "bdt",
  created_by: "user@example.com",
  paymentStatus: "paid",
  payment_date: new Date()
}
```

The payment document connects the Stripe transaction with the corresponding parcel.

---

# 🏍️ Riders Collection

Example:

```js
{
  uid: "firebase-user-uid",
  email: "rider@example.com",
  name: "Rider Name",

  region: "Dhaka",
  district: "Dhaka",

  phone: "017XXXXXXXX",

  bikeBrandModel: "Yamaha FZ",
  bikeRegistrationNumber: "DHAKA-XX-XXXX",

  about: "Experienced delivery rider",

  status: "pending",

  createdAt: new Date()
}
```

### Rider Status

```text
pending
approved
rejected
```

---

# 📍 Tracking Collection

Tracking information is stored as separate records so that a parcel can have a complete delivery history.

Example:

```js
{
  parcelId: "parcel-id",

  status: "picked_up",

  message: "Parcel picked up from sender",

  location: "Dhaka",

  updatedBy: "rider@example.com",

  createdAt: new Date()
}
```

Example tracking flow:

```text
pending
   ↓
picked_up
   ↓
in_transit
   ↓
arrived_at_hub
   ↓
out_for_delivery
   ↓
delivered
```

---

# 🌐 API Endpoints

## 🔐 Users

### Create/Update User

```http
POST /users
```

Used to create or update a user's information after Firebase authentication.

---

### Get Users

```http
GET /users
```

Admin-protected endpoint for retrieving users.

---

### Get User by Email

```http
GET /users/:email
```

Returns user information associated with an email address.

---

# 📦 Parcels

### Create Parcel

```http
POST /parcels
```

Creates a new parcel.

Example request:

```json
{
  "parcelType": "non-document",
  "title": "Electronics",
  "weight": 2,
  "sender": {
    "name": "Sender",
    "contact": "017XXXXXXXX",
    "region": "Dhaka",
    "serviceCenter": "Dhaka Center",
    "address": "Dhaka",
    "pickupInstruction": "Call before pickup"
  },
  "receiver": {
    "name": "Receiver",
    "contact": "018XXXXXXXX",
    "region": "Chittagong",
    "serviceCenter": "Chittagong Center",
    "address": "Chittagong",
    "deliveryInstruction": "Call before delivery"
  },
  "deliveryCost": 150
}
```

---

### Get User Parcels

```http
GET /parcels?email=user@example.com
```

Returns parcels created by the authenticated user.

---

### Get Parcel by ID

```http
GET /parcels/:id
```

Returns detailed information about a parcel.

---

### Update Parcel

```http
PATCH /parcels/:id
```

Updates parcel information.

---

### Update Parcel Status

```http
PATCH /parcels/status/:id
```

Updates the delivery status of a parcel.

---

# 💰 Payments

### Create Payment Intent

```http
POST /create-payment-intent
```

Creates a Stripe PaymentIntent for a parcel payment.

Example:

```json
{
  "amount": 150,
  "parcelId": "parcel-id"
}
```

---

### Save Payment

```http
POST /payments
```

Stores successful payment information in MongoDB.

---

### Get Payment History

```http
GET /payments?email=user@example.com
```

Returns payment history for the authenticated user.

---

# 🏍️ Riders

### Apply as Rider

```http
POST /riders
```

Creates a rider application.

---

### Get Riders

```http
GET /riders
```

Admin endpoint for retrieving rider applications.

---

### Get Rider by Email

```http
GET /riders/:email
```

Returns rider information.

---

### Update Rider Status

```http
PATCH /riders/status/:id
```

Updates rider application status.

Example:

```json
{
  "status": "approved"
}
```

---

### Assign Rider

```http
PATCH /parcels/assign-rider/:id
```

Assigns a rider to a parcel.

---

# 📍 Tracking APIs

### Add Tracking Update

```http
POST /tracking
```

Creates a new tracking record.

Example:

```json
{
  "parcelId": "parcel-id",
  "status": "in_transit",
  "message": "Parcel is on the way",
  "location": "Dhaka"
}
```

---

### Get Parcel Tracking

```http
GET /tracking/:parcelId
```

Returns the tracking history of a parcel.

---

# 💳 Stripe Payment Flow

GoCarry uses Stripe for secure online payments.

```text
Customer
   │
   ▼
GoCarry Client
   │
   │ Request payment
   ▼
GoCarry Server
   │
   │ Create PaymentIntent
   ▼
Stripe
   │
   │ Client Secret
   ▼
GoCarry Client
   │
   │ Confirm Payment
   ▼
Stripe
   │
   ▼
Payment Successful
   │
   ▼
GoCarry Server
   │
   ▼
MongoDB
```

Payment records contain:

- Payment Intent ID
- Parcel ID
- Amount
- Currency
- Customer email
- Payment status
- Payment date

---

# 🚚 Parcel Delivery Workflow

```text
Customer
   │
   ▼
Create Parcel
   │
   ▼
Calculate Delivery Cost
   │
   ▼
Make Payment
   │
   ▼
Payment Successful
   │
   ▼
Parcel Ready
   │
   ▼
Admin Assigns Rider
   │
   ▼
Rider Picks Up Parcel
   │
   ▼
Parcel In Transit
   │
   ▼
Out for Delivery
   │
   ▼
Delivered
```

---

# 🔒 Protected API Request

The frontend sends the Firebase token through the `Authorization` header.

Example:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

Axios example:

```js
const response = await axiosSecure.get("/parcels");
```

The secure Axios instance attaches the Firebase token automatically.

---

# 🌍 CORS

The server is configured to allow requests from the GoCarry frontend.

Example:

```js
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
```

For production, the frontend domain should be configured through environment variables.

---

# 🧪 API Testing

The APIs can be tested using **Postman**.

Recommended testing flow:

### Authentication

```text
1. Login through Firebase
2. Get Firebase token
3. Add Bearer token to Postman
4. Call protected API
```

### Parcel

```text
1. Create parcel
2. Get parcel
3. Update parcel
4. Assign rider
5. Update delivery status
6. Check tracking history
```

### Payment

```text
1. Create payment intent
2. Complete Stripe payment
3. Save payment information
4. Check payment history
```

---

# 🧑‍💻 Local Development

Start the server:

```bash
node index.js
```

For development with automatic restart:

```bash
npm run dev
```

Example `package.json` script:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

The server will normally run at:

```text
http://localhost:5000
```

---

# 📦 Dependencies

Typical project dependencies include:

```bash
npm install express cors dotenv mongodb firebase-admin stripe
```

Development dependency:

```bash
npm install -D nodemon
```

---

# 🔐 Security Practices

GoCarry follows several backend security practices:

- Firebase token verification
- Protected API routes
- Role-based authorization
- Environment variables for secrets
- Stripe secret key stored on server
- MongoDB credentials stored in environment variables
- CORS configuration
- Server-side authentication checks
- Admin-only operations
- Rider-only operations

### Never expose these values in frontend code:

```text
MONGODB_URI
STRIPE_SECRET_KEY
Firebase Admin private key
Database credentials
```

---

# 📈 Future Improvements

Potential future backend improvements include:

- Real-time parcel tracking
- WebSocket integration
- Advanced rider location tracking
- Delivery notifications
- Email notifications
- SMS notifications
- Automated payment verification
- Parcel analytics
- Admin dashboard analytics API
- Rider performance reports
- Delivery history
- Rate limiting
- Request validation
- API logging
- Centralized error handling
- API documentation with Swagger/OpenAPI

---

# 🏗️ Backend Architecture

```text
                    ┌─────────────────────┐
                    │    GoCarry Client   │
                    │      React.js       │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Express.js API    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │  Firebase  │   │  MongoDB   │   │   Stripe   │
       │    Auth    │   │  Database  │   │  Payments  │
       └────────────┘   └────────────┘   └────────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Business Logic    │
                    │ Parcels / Riders /  │
                    │ Users / Tracking    │
                    └─────────────────────┘
```

---

# 👥 User Roles

## Customer

Customers can:

- Create parcels
- View their parcels
- Make payments
- View payment history
- Track parcels
- Manage their profile

## Rider

Riders can:

- Apply as a rider
- View assigned parcels
- Update delivery status
- Add tracking updates
- Manage delivery workflows

## Admin

Admins can:

- Manage users
- Manage riders
- Approve/reject rider applications
- Assign riders
- Manage parcel operations
- Monitor delivery activity

---

# 📊 Main Data Relationships

```text
User
 │
 ├── creates ──► Parcels
 │
 └── makes ────► Payments


Parcel
 │
 ├── assigned to ──► Rider
 │
 ├── has ──────────► Payment
 │
 └── has ──────────► Tracking History


Rider
 │
 └── delivers ─────► Parcel
```

---

# 🌱 Environment Setup

Example `.env`:

```env
PORT=5000

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

DB_NAME=gocarry

STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

CLIENT_URL=http://localhost:5173
```

For production:

```env
CLIENT_URL=https://your-production-domain.com
```

---

# 🚀 Deployment

The GoCarry server can be deployed to platforms such as:

- Render
- Railway
- Vercel Serverless
- VPS
- AWS
- DigitalOcean

After deployment:

1. Add production environment variables.
2. Configure MongoDB network access.
3. Configure Firebase Admin credentials.
4. Configure Stripe production credentials.
5. Update CORS with the production frontend URL.
6. Update the client API base URL.
7. Test all protected endpoints.
8. Test Stripe payment flow.

---

# 📝 Error Handling

API responses should follow a consistent structure.

### Success

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Something went wrong"
}
```

Common HTTP status codes:

| Status | Meaning               |
| ------ | --------------------- |
| `200`  | Successful request    |
| `201`  | Resource created      |
| `400`  | Bad request           |
| `401`  | Unauthorized          |
| `403`  | Forbidden             |
| `404`  | Resource not found    |
| `500`  | Internal server error |

---

# 🧹 Git & GitHub

The following files should not be committed:

```text
.env
node_modules/
serviceAccountKey.json
```

Example `.gitignore`:

```gitignore
node_modules
.env
serviceAccountKey.json
```

---

# 📚 Development Workflow

```text
1. Create feature branch
        ↓
2. Implement API
        ↓
3. Add authentication/authorization
        ↓
4. Test with Postman
        ↓
5. Connect frontend
        ↓
6. Test complete workflow
        ↓
7. Commit changes
        ↓
8. Push to GitHub
        ↓
9. Deploy
```

---

# 🤝 Contribution

Contributions, improvements, and suggestions are welcome.

### Steps

```bash
git clone https://github.com/tushar-hossain/GoCarry-server-side

cd GoCarry-server-side

npm install

npm run dev
```

Create a new branch:

```bash
git checkout -b feature/your-feature
```

Commit changes:

```bash
git add .
git commit -m "Add your feature"
```

Push the branch:

```bash
git push origin feature/your-feature
```

---

# 📄 License

This project is developed for educational and portfolio purposes.

---

# 👨‍💻 Developer

**Md. Tushar Hossain**

MERN Stack Developer / Junior Software Developer

**Location:** Dhaka, Bangladesh

---

## ⭐ GoCarry

GoCarry is designed to provide a reliable and user-friendly parcel delivery experience through secure APIs, efficient parcel management, rider workflows, real-time delivery tracking, and integrated online payments.

```text
Built with ❤️ using Node.js, Express.js, MongoDB, Firebase & Stripe
```
