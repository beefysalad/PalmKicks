# 👟 PalmKicks

A modern e-commerce platform for sneakers and footwear, built with Next.js 16, React 19, and Prisma ORM.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748?logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css)

## ✨ Features

### Customer Features

- 🛍️ **Product Browsing** - Browse sneakers by category, brand, and gender
- 🔍 **Advanced Search** - Filter products by multiple criteria
- 🛒 **Shopping Cart** - Add, remove, and manage cart items
- 💳 **Checkout** - Streamlined checkout process with order tracking
- 📦 **Order Tracking** - Track order status with unique order IDs
- 🎨 **Modern UI** - Beautiful, responsive design with smooth animations

### Admin Features

- 🔐 **Secure Authentication** - NextAuth.js powered admin login
- 📊 **Dashboard** - Overview of products, orders, and revenue
- 📦 **Product Management** - Full CRUD operations for products
- 🏷️ **Brand Management** - Manage sneaker brands
- 📋 **Order Management** - View and update order statuses
- ⭐ **Featured Products** - Control homepage carousel products
- 📁 **Image Upload** - File upload with local storage

## 🛠️ Tech Stack

### Frontend

- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** TailwindCSS 4 + Radix UI
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **State Management:** TanStack Query
- **Notifications:** Sonner

### Backend

- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Authentication:** NextAuth.js 5 (Beta)
- **Password Hashing:** bcryptjs
- **API:** Next.js API Routes

### Development

- **Language:** TypeScript 5
- **Linting:** ESLint 9
- **Package Manager:** npm

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 20.x or higher
- npm or yarn
- PostgreSQL database

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/palmkicks.git
cd palmkicks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/palmkicks"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: For production
# NEXTAUTH_URL="https://yourdomain.com"
```

### 4. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📂 Project Structure

```
palmkicks/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin panel routes
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── brands/
│   │   ├── featured/
│   │   └── login/
│   ├── components/pages/         # Page-specific components
│   │   ├── Admin/                # Admin page components
│   │   ├── Cart/
│   │   ├── Checkout/
│   │   ├── LandingPage/
│   │   ├── Order/
│   │   ├── Product/
│   │   ├── Shop/
│   │   └── TrackOrder/
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   └── upload/               # File upload endpoint
│   ├── cart/                     # Shopping cart page
│   ├── checkout/                 # Checkout page
│   ├── order/                    # Order confirmation
│   ├── product/                  # Product details
│   ├── shop/                     # Shop listing
│   └── track/                    # Order tracking
├── components/ui/                # Reusable UI components
├── lib/                          # Utility libraries
│   ├── admin-auth.ts             # Admin authentication
│   ├── admin-brands.ts           # Brand management
│   ├── admin-featured.ts         # Featured products
│   ├── admin-products.ts         # Product management
│   ├── orders.ts                 # Order handling
│   ├── products.ts               # Product queries
│   └── prisma.ts                 # Prisma client
├── prisma/
│   ├── migrations/               # Database migrations
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data
├── public/                       # Static assets
│   ├── uploads/                  # User-uploaded images
│   └── icons/                    # Brand icons
└── types/                        # TypeScript type definitions
```

## 🗄️ Database Schema

### Models

- **Brand** - Sneaker brands (Nike, Adidas, etc.)
- **Product** - Footwear products with images, sizes, colors
- **ProductImage** - Additional product images
- **Order** - Customer orders with tracking
- **OrderItem** - Individual items in orders
- **Admin** - Admin users for dashboard access

### Key Features

- UUID primary keys
- Automatic timestamps (`createdAt`, `updatedAt`)
- Cascade deletes for related data
- Enums for gender and order status
- JSON fields for flexible size/color arrays

## 🔑 Admin Access

### Default Admin Credentials

After running the seed script:

- **Username:** `admin`
- **Password:** `admin123`

**⚠️ Important:** Change these credentials in production!

### Admin Routes

- Dashboard: `/admin/dashboard`
- Products: `/admin/products`
- Orders: `/admin/orders`
- Brands: `/admin/brands`
- Featured: `/admin/featured`

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:seed      # Seed database with sample data

# Code Quality
npm run lint         # Run ESLint
```

## 🎨 Component Architecture

### Page Components Pattern

All admin pages follow a clean separation pattern:

- **Route files** (`page.tsx`) - Only imports and renders
- **Component files** (`components/pages/Admin/*`) - Contains full logic

Example:

```typescript
// app/admin/dashboard/page.tsx
import DashboardPage from "@/app/components/pages/Admin/Dashboard";

export default function AdminDashboard() {
  return <DashboardPage />;
}
```

### Benefits

✅ Separation of concerns  
✅ Easy to test and maintain  
✅ Consistent code structure  
✅ Better developer experience

## 🔐 Authentication

- **Customer:** No authentication required (guest checkout)
- **Admin:** NextAuth.js with credentials provider
- **Sessions:** Secure JWT-based sessions
- **Protected Routes:** Middleware guards admin routes

## 📦 File Upload

- **Storage:** Cloudinary (cloud-based image storage)
- **Endpoint:** `/api/upload`
- **Folder:** Images are stored in the `products` folder in Cloudinary
- **Supported:** Image files for products and brands
- **Environment Variables Required:**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

## 🎯 Key Features Implementation

### Shopping Cart

- Local storage persistence
- Real-time updates
- Size and color selection
- Quantity management

### Order Tracking

- Unique order IDs (format: `PK-YYYY-XXXXX`)
- Status updates (pending → confirmed → processing → shipped → delivered)
- Email notifications (configurable)

### Featured Products

- Admin-controlled homepage carousel
- Dynamic product selection
- Optimized image loading

## 🚢 Deployment

### Build Command

```bash
npm run build
```

This will:

1. Generate Prisma Client
2. Run database migrations
3. Build Next.js app
4. Seed the database

### Environment Variables (Production)

Ensure you set:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your production domain
- `NEXTAUTH_SECRET` - Strong secret key

### Recommended Platforms

- **Vercel** (Recommended for Next.js)
- **Railway** / **Render** (for database)
- **Cloudflare Pages**
- **Netlify**

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [shadcn/ui](https://ui.shadcn.com/) - Component design inspiration

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by John Patrick Ryan Mandal
