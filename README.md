# ShopVerse Commerce

A beginner-friendly but scalable full-stack eCommerce starter inspired by modern Shopify-style workflows.

It includes:

- JWT-based authentication with admin and customer roles
- Admin dashboard for branding, shipping, promotions, payments, products, orders, customers, and analytics
- Customer storefront with social proof, reviews, wishlist, guest checkout, COD-friendly order tracking, and recently viewed products
- Stripe-ready payment initialization plus tracked manual payment options for GCash, Maya, bank transfer, PayPal sandbox, and COD
- Dropshipping provider adapters for AliExpress, CJ Dropshipping, and Spocket
- React + Tailwind frontend and Express + MongoDB backend

## Folder structure

```text
shopverse-commerce/
|-- backend/
|   |-- uploads/
|   |-- .env.example
|   |-- package.json
|   `-- src/
|       |-- app.js
|       |-- server.js
|       |-- config/
|       |   |-- db.js
|       |   |-- env.js
|       |   `-- multer.js
|       |-- controllers/
|       |   |-- authController.js
|       |   |-- orderController.js
|       |   |-- analyticsController.js
|       |   |-- newsletterController.js
|       |   |-- productController.js
|       |   |-- reviewController.js
|       |   |-- statsController.js
|       |   |-- storeSettingsController.js
|       |   |-- supplierController.js
|       |   |-- uploadController.js
|       |   `-- userController.js
|       |-- data/
|       |   |-- sampleProducts.js
|       |   |-- sampleUsers.js
|       |   `-- seed.js
|       |-- middleware/
|       |   |-- auth.js
|       |   `-- errorHandler.js
|       |-- models/
|       |   |-- NewsletterSubscriber.js
|       |   |-- Order.js
|       |   |-- Product.js
|       |   |-- Review.js
|       |   |-- StoreSettings.js
|       |   `-- User.js
|       |-- routes/
|       |   |-- analyticsRoutes.js
|       |   |-- authRoutes.js
|       |   |-- newsletterRoutes.js
|       |   |-- orderRoutes.js
|       |   |-- paymentRoutes.js
|       |   |-- productRoutes.js
|       |   |-- reviewRoutes.js
|       |   |-- statsRoutes.js
|       |   |-- storeSettingsRoutes.js
|       |   |-- supplierRoutes.js
|       |   |-- uploadRoutes.js
|       |   `-- userRoutes.js
|       |-- services/
|       |   |-- paymentService.js
|       |   |-- seedService.js
|       |   |-- storeSettingsService.js
|       |   `-- dropshipping/
|       |       |-- aliExpressService.js
|       |       |-- baseProvider.js
|       |       |-- cjDropshippingService.js
|       |       |-- providerFactory.js
|       |       `-- spocketService.js
|       `-- utils/
|           |-- ApiError.js
|           |-- asyncHandler.js
|           |-- commerce.js
|           |-- createSlug.js
|           |-- createToken.js
|           `-- validators.js
|-- frontend/
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx
|       |-- index.css
|       |-- main.jsx
|       |-- api/
|       |   `-- client.js
|       |-- components/
|       |   |-- admin/
|       |   |   `-- StatsCard.jsx
|       |   |-- common/
|       |   |   |-- LoadingScreen.jsx
|       |   |   `-- OrderStatusBadge.jsx
|       |   |-- layout/
|       |   |   |-- AdminSidebar.jsx
|       |   |   |-- Footer.jsx
|       |   |   `-- Navbar.jsx
|       |   `-- store/
|       |       |-- ProductCard.jsx
|       |       `-- SearchFilters.jsx
|       |-- context/
|       |   |-- AuthContext.jsx
|       |   |-- CartContext.jsx
|       |   |-- StoreSettingsContext.jsx
|       |   `-- WishlistContext.jsx
|       |-- layouts/
|       |   |-- AdminLayout.jsx
|       |   `-- StoreLayout.jsx
|       |-- pages/
|       |   |-- admin/
|       |   |   |-- AdminOrdersPage.jsx
|       |   |   |-- CustomersPage.jsx
|       |   |   |-- DashboardPage.jsx
|       |   |   |-- DropshippingPage.jsx
|       |   |   `-- ProductsPage.jsx
|       |   `-- store/
|       |       |-- AuthPage.jsx
|       |       |-- CartPage.jsx
|       |       |-- CheckoutPage.jsx
|       |       |-- HomePage.jsx
|       |       |-- OrdersPage.jsx
|       |       |-- ProductDetailsPage.jsx
|       |       |-- TrackOrderPage.jsx
|       |       `-- WishlistPage.jsx
|       `-- routes/
|           `-- ProtectedRoute.jsx
|-- .gitignore
|-- package.json
`-- README.md
```

## Tech stack

- Frontend: React, React Router, Tailwind CSS, Framer Motion, Axios
- Backend: Node.js, Express, JWT auth, Multer, Stripe
- Database: MongoDB with Mongoose

## Features included

### Authentication

- Register and login with email and password
- Admin and customer roles
- JWT token storage in local storage
- Protected customer and admin routes

### Admin dashboard

- Sales, profit estimate, conversion rate, and revenue trend cards
- Low-stock alerts, best-selling products, and most-viewed product insights
- Branding controls for store name, logo, banner, and hero image
- Shipping settings for fixed or location-based fees
- Payment toggles for Stripe, PayPal, GCash, Maya, bank transfer, and COD
- Promotion controls for bundles, free gifts, limited offers, and promo codes
- Product create, edit, and delete flow with variants, cost price, and bundle eligibility
- Product image upload via Multer
- Order and payment status management
- Customer list
- Dropshipping sandbox actions for connect, import, and sync

### Customer storefront

- Homepage with gadget-focused hero section, promotions, newsletter capture, and product grid
- Search, sort, and category filters
- Product detail page with social proof, reviews, variants, and wishlist
- Cart with quantity controls
- Checkout page with guest checkout, shipping preview, promo codes, and multi-payment options
- Wishlist page
- Order history page with tracking statuses
- Public guest order tracking page

### Payments

- Stripe-ready payment intent endpoint
- COD, GCash, Maya, bank transfer, and PayPal sandbox-ready tracked checkout options
- Mock sandbox fallback when no Stripe secret key is configured

### Dropshipping

- Provider adapter structure for:
  - AliExpress
  - CJ Dropshipping
  - Spocket
- Import placeholder products into your local catalog
- Sync workflow scaffold for stock and pricing updates

## Setup instructions

### 1. Install prerequisites

Install these first on your machine:

- Node.js LTS: https://nodejs.org/
- MongoDB Community Server: https://www.mongodb.com/try/download/community

After installing, restart your terminal and confirm:

```bash
node -v
npm -v
```

### 2. Open the project

Project location:

`D:\VS Code Files\shopverse-commerce`

### 3. Install dependencies

From the project root:

```bash
npm install
```

### 4. Create environment files

Create these files:

- `backend/.env`
- `frontend/.env`

Copy from:

- `backend/.env.example`
- `frontend/.env.example`

Example backend values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/shopverse
JWT_SECRET=replace-this-with-a-long-secret
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=
RESEND_API_KEY=
ALERT_FROM_EMAIL=
ALERT_REPLY_TO_EMAIL=
CJ_API_KEY=
ALIEXPRESS_APP_KEY=
SPOCKET_API_KEY=
```

Example frontend values:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start MongoDB

Make sure MongoDB is running locally.

### 6. Run the app

From the root folder:

```bash
npm run dev
```

This should start:

- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

### 7. Seeded demo accounts

For local development, these are inserted automatically on first backend start when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are not set:

- Admin
  - Email: `agbayanimarkjoseph10@gmail.com`
  - Password: `KeyCode10@`

## Deployment guide

This repo now uses a native-first deployment flow:

- Website download portal: Render static site
- Backend API: Render web service
- Database: MongoDB Atlas
- Client app: Android build from the Capacitor project in `frontend/android`

### 1. Push the project to GitHub

Render imports directly from GitHub, so make sure the latest version of this project is pushed to the repository you want to deploy.

### 2. Create a MongoDB Atlas database

Create an Atlas cluster, then:

- Create a database user
- Add network access for your deployment
- Copy the connection string

Use the connection string as your backend `MONGO_URI`.

### 3. Create the Render Blueprint

In Render:

1. Click `New +`
2. Choose `Blueprint`
3. Select your GitHub repository
4. Render will detect the root `render.yaml`

That Blueprint creates:

- `shopverse-api` for the Express backend
- `shopverse-web` for the Android download portal website

### 4. Set backend environment variables in Render

Add these values to `shopverse-api`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/shopverse?retryWrites=true&w=majority
JWT_SECRET=replace-this-with-a-long-secret
CLIENT_URL=http://localhost:5173,https://shopverse-web.onrender.com
ADMIN_NAME=ShopVerse Admin
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=replace-this-with-a-strong-password
STRIPE_SECRET_KEY=
RESEND_API_KEY=re_xxxxxxxxx
ALERT_FROM_EMAIL=Mighty Couple <alerts@your-domain.com>
ALERT_REPLY_TO_EMAIL=supportmightycouple@gmail.com
CJ_API_KEY=
ALIEXPRESS_APP_KEY=
SPOCKET_API_KEY=
```

### Chat email alert setup

Chat email alerts use [Resend](https://resend.com/). The code is already wired up, but production sending only works after these backend values are configured:

- `RESEND_API_KEY`
- `ALERT_FROM_EMAIL`
- `ALERT_REPLY_TO_EMAIL` optional

Important:

- `ALERT_FROM_EMAIL` must use a sender address from a verified domain in Resend.
- `ALERT_REPLY_TO_EMAIL` can be your support inbox, including Gmail.
- If these values are missing, chat still works, but email alerts are skipped safely.

Example:

```env
RESEND_API_KEY=re_xxxxxxxxx
ALERT_FROM_EMAIL=Mighty Couple <alerts@your-domain.com>
ALERT_REPLY_TO_EMAIL=supportmightycouple@gmail.com
```

For local browser development plus the live website portal, keep `CLIENT_URL` pointed at both the local frontend and the deployed download site. Native Android requests are already allowed by the backend CORS rules for Capacitor origins.

### Website download portal

The browser site is now a native app download portal, not the storefront itself. It reads the public Android package URL from admin settings:

- `mobileApp.androidUpdateUrl`

If that field is left blank, the website and native update prompt both fall back to:

```text
https://your-backend.onrender.com/downloads/mightycouple-release.apk
```

That makes it possible to host the signed APK from the backend while keeping the shopping experience inside the installed Android app.

### Android push notifications (Firebase / FCM)

Android push notifications are wired in the app and backend, but real remote push delivery only works after Firebase is configured.

#### Backend env values

Add these to `shopverse-api`:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

If your host makes raw JSON hard to paste, use Base64 instead:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwiLi4uIn0=
```

Use either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64`.

#### Android app file

Download `google-services.json` from Firebase and place it here:

```text
frontend/android/app/google-services.json
```

This file is ignored by Git on purpose and should not be committed.

#### Firebase setup flow

1. Create a Firebase project for the Android app.
2. Add an Android app with package name:

```text
com.mightycouple.commerce
```

3. Download `google-services.json` and copy it into `frontend/android/app/google-services.json`.
4. In Firebase Console, open Cloud Messaging and make sure the project is enabled for FCM.
5. In Google Cloud / Firebase service accounts, generate a service account JSON with permission to send Firebase Cloud Messaging requests.
6. Add the service account JSON to the backend using one of the env vars above.

#### After Firebase files are added

Rebuild and sync Android:

```bash
cd frontend
npm run build
npx cap sync android
```

### 5. Set frontend environment variables in Render

Add this value to `shopverse-web`:

```env
VITE_API_URL=https://shopverse-api.onrender.com/api
```

### 6. Build and sync the Android app

After the backend is live and your native API target is correct, rebuild the frontend bundle and sync it into Android:

```bash
cd frontend
npm run build
npx cap sync android
```

### 7. Test the live native app and website download portal

Check these before distribution:

- Website home/download page
- Backend health check: `https://your-backend.onrender.com/api/health`
- APK direct download: `https://your-backend.onrender.com/downloads/mightycouple-release.apk`
- Login using the custom `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in Render
- Product creation and checkout flow
- Push notification registration and delivery on Android
- APK or AAB install on a real device

### Production note about uploads

The current upload system stores files on the backend server's local disk (`backend/uploads`). This is fine for local development, but on many cloud hosts those files can be lost after redeploys or instance restarts. For long-term production use, move uploads to a storage service such as Cloudinary or Amazon S3.

## Suggested next upgrades

- Replace the current tracked manual flows for GCash, Maya, PayPal, and bank transfer with real gateway integrations
- Add real Stripe Checkout or Payment Element on the frontend
- Replace local file uploads with Cloudinary or S3
- Add refresh tokens or HTTP-only cookie auth
- Add supplier credential persistence in MongoDB
- Add email notifications and shipment webhooks

## Notes

- Frontend build verification was completed successfully with Vite production build.
- The current payment setup fully tracks multiple methods in orders, while Stripe remains the only automated sandbox payment initialization in code.
- Newsletter capture is included, but outbound campaigns or email automation are not yet wired up.
