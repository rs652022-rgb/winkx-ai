# WinkX AI 🤖💬

> **The premium open-source alternative to WATI, ManyChat, Respond.io and Botpress.**
> AI-powered WhatsApp, Instagram & Facebook automation platform for businesses, creators, and agencies.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com)

---

## ✨ Features

### 📱 Multi-Channel Messaging
- **WhatsApp Business API** (Cloud API) — messages, templates, media
- **Instagram DMs** — auto-reply, story mentions, comment automation
- **Facebook Messenger** — page DMs, post comment replies

### 🤖 AI-Powered Automation
- **Visual Flow Builder** — drag-and-drop with React Flow
- **AI Flow Generator** — describe your flow in plain English, AI builds it
- **AI Agents** — GPT-4o, Claude 3.5, Gemini 1.5 powered chatbots
- **Knowledge Base (RAG)** — train agents on your docs, PDFs, URLs

### 📊 CRM & Sales
- Unified contact management
- Lead pipeline with Kanban board
- Deal tracking & revenue reporting
- Lead qualification & scoring

### 📢 Campaigns
- Broadcast messages to segmented audiences
- Drip campaigns & sequences
- Campaign analytics (sent, delivered, read, clicked)

### 📈 Analytics
- Real-time message volume charts
- Channel breakdown
- Lead source attribution
- Campaign performance

### 💳 Billing
- Stripe subscription management
- Usage-based billing
- Tiered plans (Starter / Growth / Enterprise)

### 🔧 Developer Tools
- REST API with API key auth
- Webhooks with HMAC verification
- SDK-ready endpoints

---

## 🏗️ Architecture

```
winkx-ai/                    # Turborepo monorepo
├── apps/
│   ├── api/                 # Node.js + Express + Socket.IO
│   │   ├── src/
│   │   │   ├── routes/      # All API routes
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, rate limit, upload
│   │   │   └── server.ts    # Entry point
│   └── web/                 # Next.js 15 App Router
│       ├── src/
│       │   ├── app/         # Pages (App Router)
│       │   ├── components/  # UI components
│       │   ├── lib/         # API client, utils
│       │   └── stores/      # Zustand state
├── packages/
│   └── db/                  # Prisma schema + migrations
├── nginx/                   # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| **Flow Builder** | React Flow |
| **State** | Zustand, React Query (TanStack) |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | PostgreSQL 16 + pgvector |
| **ORM** | Prisma |
| **Cache / Queue** | Redis |
| **Auth** | JWT + Refresh tokens, Google OAuth, 2FA (TOTP) |
| **AI** | OpenAI GPT-4o, Anthropic Claude, Google Gemini |
| **Payments** | Stripe |
| **Messaging** | Meta Graph API (WhatsApp, Instagram, Facebook) |
| **Storage** | AWS S3 (or compatible) |
| **Email** | Nodemailer (SMTP) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- A Meta Developer account (for WhatsApp/Instagram/Facebook)
- Stripe account (for billing)
- OpenAI/Anthropic/Google AI API key

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/winkx-ai.git
cd winkx-ai

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose run --rm migrate

# 5. Open the app
open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local Postgres

# Push database schema
npx prisma db push --schema packages/db/prisma/schema.prisma

# Seed sample data (optional)
npx ts-node packages/db/seed.ts

# Start development servers (api + web in parallel)
npm run dev
```

Apps will be available at:
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs

---

## ⚙️ Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full reference.

### Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | ≥64 char random string (`openssl rand -hex 64`) |
| `META_APP_SECRET` | Meta developer app secret |
| `META_VERIFY_TOKEN` | Random string for webhook verification |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) |

---

## 📡 Meta Integration Setup

### WhatsApp Business API
1. Go to [Meta Developers](https://developers.facebook.com)
2. Create a new app → "Business" type
3. Add WhatsApp product
4. Note your **Phone Number ID**, **WABA ID**, and generate a **System User Access Token**
5. Set webhook URL: `https://your-domain.com/webhooks/meta`
6. Subscribe to: `messages`, `message_deliveries`, `message_reads`, `messaging_postbacks`

### Instagram & Facebook
1. Same Meta app, add Messenger product
2. Connect your Facebook Page
3. Subscribe page to webhook events

---

## 🔌 API Reference

### Authentication
All API requests require a Bearer token or API key:
```
Authorization: Bearer <jwt-token>
# or
X-API-Key: wxk_live_<api-key>
```

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/channels` | List channels |
| `POST` | `/api/channels/connect` | Connect channel |
| `GET` | `/api/inbox/conversations` | List conversations |
| `POST` | `/api/inbox/:id/messages` | Send message |
| `GET` | `/api/flows` | List flows |
| `POST` | `/api/flows` | Create flow |
| `POST` | `/api/flows/ai/generate` | AI generate flow |
| `GET` | `/api/crm/contacts` | List contacts |
| `GET` | `/api/crm/leads` | List leads |
| `POST` | `/api/campaigns` | Create campaign |
| `POST` | `/api/campaigns/:id/launch` | Launch campaign |
| `GET` | `/api/analytics/dashboard` | Dashboard metrics |
| `GET` | `/api/agents` | List AI agents |
| `GET` | `/api/billing/plans` | Available plans |

Full API documentation is available at `/api-docs` (Swagger UI).

---

## 🐳 Production Deployment

### Docker Compose (recommended)
```bash
# Generate strong secrets
openssl rand -hex 64  # for JWT_SECRET
openssl rand -hex 32  # for ENCRYPTION_KEY

# Build and deploy
docker compose -f docker-compose.yml up -d --build

# Verify health
curl http://localhost:4000/health
```

### Manual Deployment
```bash
# Build all packages
npm run build

# Start API
cd apps/api && npm start

# Start Web
cd apps/web && npm start
```

### Environment Requirements
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum
- **PostgreSQL**: 16 with pgvector extension
- **Redis**: 7+

---

## 📁 Project Structure (Key Files)

```
apps/api/src/
├── server.ts              # Express app + Socket.IO setup
├── middleware/
│   ├── auth.ts            # JWT + API key authentication
│   ├── rateLimiter.ts     # Rate limiting (Redis-backed)
│   └── upload.ts          # File upload (S3)
├── routes/
│   ├── auth.ts            # Login, register, OAuth, 2FA
│   ├── channels.ts        # Channel CRUD + connect
│   ├── inbox.ts           # Conversations + messages
│   ├── flows.ts           # Flow CRUD + versions
│   ├── crm.ts             # Contacts, leads, pipeline
│   ├── campaigns.ts       # Campaign management
│   ├── agents.ts          # AI agents + knowledge base
│   ├── analytics.ts       # Metrics + reporting
│   ├── billing.ts         # Stripe + subscriptions
│   ├── templates.ts       # Template marketplace
│   ├── developer.ts       # API keys + webhooks
│   ├── admin.ts           # Super admin
│   └── meta-webhooks.ts   # Meta webhook handler
└── services/
    ├── email.ts           # Email (Nodemailer)
    └── messaging.ts       # Meta Graph API

apps/web/src/
├── app/
│   ├── (auth)/            # Login, Signup, Forgot Password
│   └── (dashboard)/
│       ├── dashboard/     # Main KPI dashboard
│       ├── inbox/         # Real-time chat inbox
│       ├── flows/         # Flow list + builder
│       ├── crm/           # Contacts, leads, pipeline
│       ├── campaigns/     # Campaign manager
│       ├── analytics/     # Analytics dashboard
│       ├── ai-agents/     # Agent builder + KB
│       ├── channels/      # Channel connections
│       ├── templates/     # Template marketplace
│       ├── billing/       # Plans + subscription
│       ├── settings/      # Profile, org, team
│       └── developer/     # API keys + webhooks
├── components/
│   ├── flow/              # React Flow nodes + panels
│   └── layout/            # Sidebar, Header
├── lib/
│   ├── api.ts             # Typed API client
│   └── utils.ts           # Helpers
└── stores/
    └── auth.ts            # Zustand auth store
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🔗 Links

- **Documentation**: https://docs.winkx.ai
- **Meta Developers**: https://developers.facebook.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **OpenAI Platform**: https://platform.openai.com

---

<p align="center">Built with ❤️ — the premium open alternative to WATI, ManyChat, Respond.io</p>
