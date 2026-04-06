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

This repo now includes a root `render.yaml` file so you can deploy the frontend and backend as separate Render services from the same repository.

### Recommended production setup

- Frontend: Render static site
- Backend: Render web service
- Database: MongoDB Atlas

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
- `shopverse-web` for the React frontend

### 4. Set backend environment variables in Render

Add these values to `shopverse-api`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/shopverse?retryWrites=true&w=majority
JWT_SECRET=replace-this-with-a-long-secret
CLIENT_URL=https://shopverse-web.onrender.com
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

If you want both local development and the live frontend to work with the same backend, `CLIENT_URL` can contain multiple comma-separated origins:

```env
CLIENT_URL=http://localhost:5173,https://shopverse-web.onrender.com
```

### 5. Set frontend environment variables in Render

Add this value to `shopverse-web`:

```env
VITE_API_URL=https://shopverse-api.onrender.com/api
```

### 6. Redeploy after URLs are known

Deploy the backend first, copy its Render URL, then update `VITE_API_URL` in the frontend service and deploy the frontend.

After the frontend URL is live, update `CLIENT_URL` in the backend service and redeploy the backend once more.

### 7. Test the live app

Check these URLs after deployment:

- Frontend home page
- Backend health check: `https://your-backend.onrender.com/api/health`
- Login using the custom `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in Render
- Product creation and checkout flow

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
