# StripePay - Complete Payment Solution

A modern, full-stack payment application built with Next.js 15, Stripe, and Supabase that demonstrates best practices for handling payments, subscriptions, and billing management.

## 🚀 Features

### Core Payment Features

- **One-time Payments** - Secure payment processing with Stripe Checkout
- **Subscription Management** - Recurring billing with multiple subscription tiers
- **Billing Portal** - Self-service billing management via Stripe Customer Portal
- **Multi-store Support** - Handle multiple stores with different pricing configurations

### User Management

- **Authentication** - User authentication and session management with Supabase
- **User Dashboard** - Personalized dashboard with subscription status and billing info
- **Profile Management** - User profile and account management

### Developer Features

- **Webhook Integration** - Real-time payment event handling
- **Environment Configuration** - Flexible environment setup for development and production
- **Advanced Filtering** - Client-side filtering for pricing and subscription data
- **Error Handling** - Comprehensive error handling and logging
- **TypeScript** - Full type safety throughout the application

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Payments**: Stripe (payments, subscriptions, webhooks)
- **Database**: Supabase (authentication, user data)
- **Styling**: Tailwind CSS with dark mode support

## 📁 Project Structure

```
src/
├── app/                    # Next.js 15 app router
│   ├── api/               # API routes
│   │   ├── checkout/      # Payment processing
│   │   ├── webhooks/      # Stripe webhook handlers
│   │   └── pricing/       # Pricing API endpoints
│   ├── admin/             # Admin panel
│   ├── billing/           # Billing management
│   ├── dashboard/         # User dashboard
│   └── pricing/           # Pricing page
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase client configurations
│   └── stripe.ts          # Stripe configuration
└── types/                 # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Stripe account
- Supabase project

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd stripe-step-by-step
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
```

Configure the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Configuration

### Stripe Setup

1. Create products and prices in your Stripe dashboard
2. Set up webhooks pointing to `/api/webhooks/stripe`
3. Configure the Stripe Customer Portal

### Supabase Setup

1. Create a new Supabase project
2. Set up authentication providers
3. Configure database tables for user data

## 📚 Documentation

- [Environment Configuration](docs/environment-configuration.md)
- [Multi-store Setup](docs/multi-store-setup.md)
- [Stripe Metadata Setup](docs/stripe-metadata-setup.md)
- [Logging & Observability](docs/logging-observability.md)
- [Supabase Auth with Next.js 15](docs/supabase-auth-nextjs15-guide.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.
