# Astral Remix - Phase 1

A content repurposing application that transforms raw notes and transcripts into professional LinkedIn posts using AI (GPT-4o).

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS + Lucide React Icons
- **Database**: Azure Cosmos DB (NoSQL API)
- **AI**: Azure OpenAI Service (GPT-4o)
- **Auth**: NextAuth.js with LinkedIn Provider
- **Language**: TypeScript

## Features

### Phase 1

1. **Remix Engine** - Convert raw content into polished LinkedIn posts
   - Text area for source content (transcripts/notes)
   - Server Action to call Azure OpenAI with custom system prompt
   - Auto-saves drafts to Cosmos DB

2. **Direct Publishing** - Publish posts directly to LinkedIn
   - One-click publishing from draft to live
   - LinkedIn OAuth integration with access token capture
   - Status tracking (DRAFT → PUBLISHED)

3. **History Dashboard** - Manage your remix library
   - Grid view of all remixes (drafts and published)
   - Quick actions: Publish, Delete, View on LinkedIn
   - Timestamps and status indicators

## Project Structure

```
astral-remix/
├── app/
│   ├── api/auth/[...nextauth]/     # NextAuth route handlers
│   ├── auth/
│   │   └── signin/page.tsx          # Sign-in page
│   ├── dashboard/
│   │   └── page.tsx                 # Main dashboard
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   ├── actions.ts                   # Server actions (remix, publish, fetch)
│   ├── globals.css                  # Global styles
│   └── providers.tsx                # Session provider wrapper
├── components/
│   ├── RemixEditor.tsx              # Create new remix UI
│   └── RemixHistory.tsx             # View & manage remixes
├── lib/
│   ├── cosmos.ts                    # Cosmos DB client (auto-provisioning)
│   └── auth-types.ts                # NextAuth session types
├── auth.ts                          # NextAuth initialization
├── auth.config.ts                   # NextAuth configuration
├── tailwind.config.ts               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies
└── .env.local.example               # Environment variables template
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm/pnpm
- Azure Cosmos DB account
- Azure OpenAI Service deployment (GPT-4o model)
- LinkedIn OAuth application credentials

### 2. Environment Configuration

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_COSMOS_ENDPOINT` - Cosmos DB endpoint URL
- `COSMOS_KEY` - Cosmos DB primary key
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT_ID` - Deployment ID for GPT-4o model
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth Client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth Client Secret
- `NEXTAUTH_SECRET` - Session encryption secret (auto-generate: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Base URL for NextAuth callbacks (local: `http://localhost:3000`)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## Key Implementation Details

### Cosmos DB Auto-Provisioning (lib/cosmos.ts)

- **Database**: `AstralDB` (auto-created on first run)
- **Container**: `Remixes` with partition key `/userId`
- **Auto-scale**: 400-4000 RU/s (configurable)
- Initializes on app startup, creates missing resources on demand

### NextAuth Configuration (auth.config.ts)

- **JWT Callback**: Captures LinkedIn `access_token` for API calls
- **Session Callback**: Adds `accessToken` and `provider` to session object
- **Scopes**: `openid profile email w_member_social` (required for publishing)

### Server Actions (app/actions.ts)

1. **generateRemix** - Calls Azure OpenAI to create LinkedIn post from raw content
2. **publishToLinkedIn** - POSTs to LinkedIn API using stored access token
3. **getUserRemixes** - Fetches all remixes for current user
4. **deleteRemix** - Removes draft remixes (published ones are immutable)

### Data Model

```typescript
interface RemixRecord {
  id: string;                    // Unique identifier
  userId: string;                // User ID (partition key)
  sourceContent: string;         // Original raw content
  generatedPost: string;         // AI-generated LinkedIn post
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;             // ISO timestamp
  publishedAt?: string;          // When published to LinkedIn
  linkedInUrl?: string;          // LinkedIn post URN/URL
}
```

## Best Practices Implemented

✅ **Type Safety** - Full TypeScript throughout  
✅ **Server Actions** - Secure API layer without traditional endpoints  
✅ **Partition Keys** - Multi-tenant scalability with `/userId`  
✅ **Auto-Provisioning** - Zero-config Cosmos DB setup  
✅ **Token Management** - Secure JWT token handling via NextAuth  
✅ **Error Handling** - Graceful fallbacks and user feedback  
✅ **UI/UX** - Tailwind + Lucide for professional appearance  

## Deployment Checklist

- [ ] Set up Azure Cosmos DB account and get connection string
- [ ] Create Azure OpenAI deployment with GPT-4o model
- [ ] Register LinkedIn OAuth application
- [ ] Set all environment variables in deployment platform
- [ ] Build and test locally: `npm run build && npm start`
- [ ] Deploy to Vercel or your hosting platform
- [ ] Test LinkedIn OAuth flow in production environment

## Troubleshooting

### Cosmos DB Connection Issues
- Verify `NEXT_PUBLIC_COSMOS_ENDPOINT` includes `:443/`
- Check firewall rules allow your IP
- Ensure `COSMOS_KEY` is the **Primary Key** (not secondary)

### LinkedIn Publishing Fails
- Confirm `w_member_social` scope is in authorization URL
- Verify access token is fresh (session may have expired)
- Check LinkedIn API version in publishToLinkedIn action

### OpenAI Errors
- Verify model name matches deployment ID
- Check API version is compatible with GPT-4o
- Ensure quota is available in Azure OpenAI resource

## Future Enhancements (Phase 2+)

- [ ] Multiple content input formats (video transcripts, PDFs, URLs)
- [ ] Template system for different post types
- [ ] Analytics dashboard (engagement metrics)
- [ ] Scheduled publishing
- [ ] Multi-platform support (Twitter, Medium, etc.)
- [ ] AI-powered hashtag and emoji suggestions
- [ ] Team collaboration features

## License

Proprietary - Project Astra (UAB)
