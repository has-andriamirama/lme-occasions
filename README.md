# LME Occasions — Plateforme de vente automobile premium

Site web complet de vente de voitures d'occasion avec espace admin sécurisé, paiement Stripe, temps réel et gestion automatisée des réservations.

---

## Stack technique

| Couche           | Technologie                            |
|------------------|-----------------------------------------|
| Framework        | Next.js 14 (App Router) + TypeScript   |
| UI / Styles      | Tailwind CSS, dark theme premium       |
| Base de données  | PostgreSQL + Prisma ORM                |
| Authentification | NextAuth.js v4 (JWT, brute-force)      |
| Paiement         | Stripe Checkout + Webhooks             |
| Emails           | Nodemailer (SMTP)                      |
| Temps réel       | Pusher Channels                        |
| Images           | Cloudinary                             |
| Cron             | Vercel Cron Jobs (toutes les heures)   |
| Déploiement      | Vercel + Railway (PostgreSQL)          |

---

## Fonctionnalités

### Espace Public
- 🏠 Landing page avec hero animé, slider d'images
- 🚗 Catalogue filtrable / cherchable / triable (marque, prix, km, année, carburant, boîte)
- 📄 Page détail véhicule avec galerie, équipements, formulaire de réservation
- 💳 Paiement acompte Stripe (30%) avec confirmation email automatique
- ⚡ Statut voiture mis à jour en temps réel (Pusher) si quelqu'un réserve pendant votre visite
- 📧 Popup newsletter automatique à chaque visite
- 📬 Formulaire de contact avec anti-spam honeypot
- 📋 Pages CGV, Confidentialité, Mentions légales

### Espace Admin
- 🔐 Authentification sécurisée (hash bcrypt, anti brute-force 5 tentatives/15 min)
- 🔑 Changement de mot de passe forcé au premier login
- 📊 Dashboard avec KPIs en temps réel
- 🚗 CRUD complet véhicules (galerie, équipements dynamiques, statuts)
- 🏷️ Gestion offres/promotions (% ou montant fixe, dates, véhicules ciblés)
- 📅 Gestion réservations (finaliser vente / annuler, countdown 5 jours)
- 💬 Gestion messages contact (lu/non-lu, répondre)
- 👥 Gestion administrateurs (SUPER_ADMIN uniquement, dernier admin protégé)
- 📋 Journal d'audit de toutes les actions admin
- 🔔 Notifications temps réel (nouvelles réservations, messages)

### Sécurité
- 🔒 Sessions JWT sécurisées (8h)
- 🛡️ Middleware de protection de toutes les routes `/admin`
- ⚛️ Transactions atomiques Prisma (anti double-réservation)
- 🕵️ Protection honeypot anti-spam
- 🔑 Validation Zod côté serveur sur tous les endpoints
- 🚫 SUPER_ADMIN requis pour gérer les admins
- 📜 Rate limiting sur le formulaire de contact

---

## Installation

### Prérequis
- Node.js 18+
- PostgreSQL (Railway, Supabase, Neon, ou local)
- Compte Stripe
- Compte Pusher (pusher.com)
- Compte Cloudinary
- SMTP (Gmail, Postmark, Mailtrap…)

### 1. Cloner et installer

```bash
git clone https://github.com/votre-repo/lme-occasions.git
cd lme-occasions
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez toutes les variables dans `.env.local` :

```env
# Base de données
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lme_occasions"

# NextAuth (générez avec: openssl rand -base64 32)
NEXTAUTH_SECRET="votre-secret-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="votre@gmail.com"
SMTP_PASS="votre-app-password"
ADMIN_EMAIL="test@lmeoccasions.com"

# Pusher
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Cron
CRON_SECRET="votre-secret-cron"
```

### 3. Base de données

```bash
# Créer le schéma
npx prisma db push

# Créer l'admin par défaut (admin / admin)
npm run db:seed
```

### 4. Lancer en développement

```bash
npm run dev
```

Accès : http://localhost:3000  
Admin : http://localhost:3000/login (admin / admin)

---

## Configuration Stripe

### 1. Créer les clés API
Allez sur [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) et copiez :
- `sk_test_...` → `STRIPE_SECRET_KEY`
- `pk_test_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 2. Configurer le Webhook
```bash
# En développement avec Stripe CLI
stripe listen --forward-to localhost:3000/api/payments/webhook

# En production, créez le webhook sur dashboard.stripe.com/webhooks
# URL: https://votre-domaine.com/api/payments/webhook
# Événements: checkout.session.completed, checkout.session.expired
```

Copiez le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.

---

## Configuration Email (Gmail)

1. Activez la validation en 2 étapes sur votre compte Google
2. Allez sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Créez un "Mot de passe d'application" → copiez dans `SMTP_PASS`

Pour la production, préférez [Postmark](https://postmarkapp.com) ou [Resend](https://resend.com).

---

## Configuration Admin initiale

Au premier lancement :
1. Connectez-vous avec `admin` / `admin`
2. Vous serez redirigé vers la page de changement de mot de passe
3. Créez un mot de passe fort (8 car., maj., chiffre, spécial)
4. Commencez à ajouter vos véhicules

Pour ajouter d'autres admins : menu **Administrateurs** (Super Admin uniquement).

---

## Déploiement sur Vercel + Railway

### 1. Base de données (Railway)
```bash
# Créez un projet PostgreSQL sur railway.app
# Copiez la DATABASE_URL fournie
```

### 2. Déploiement Vercel
```bash
npm i -g vercel
vercel --prod
```

Ajoutez toutes les variables d'environnement dans le dashboard Vercel.

### 3. Cron Job (automatique)
Le fichier `vercel.json` configure automatiquement le cron toutes les heures pour expirer les réservations.

Protégez le endpoint avec `CRON_SECRET` dans vos variables Vercel.

### 4. Webhook Stripe en production
```
URL: https://votre-domaine.vercel.app/api/payments/webhook
Événements: checkout.session.completed, checkout.session.expired, payment_intent.payment_failed
```

---

## Structure du projet

```
lme-occasions/
├── prisma/
│   ├── schema.prisma         # Schéma DB complet
│   └── seed.ts               # Seed admin + véhicules exemple
├── public/
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── (admin)/          # Espace admin protégé
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       ├── cars/
│   │   │       ├── offers/
│   │   │       ├── reservations/
│   │   │       ├── contacts/
│   │   │       ├── admins/
│   │   │       └── settings/
│   │   ├── (public)/         # Espace public
│   │   │   ├── page.tsx      # Landing
│   │   │   ├── cars/         # Catalogue + détail
│   │   │   ├── contact/
│   │   │   └── cgv/
│   │   ├── api/              # Routes API
│   │   │   ├── auth/
│   │   │   ├── cars/
│   │   │   ├── offers/
│   │   │   ├── reservations/
│   │   │   ├── contacts/
│   │   │   ├── admins/
│   │   │   ├── payments/
│   │   │   ├── newsletter/
│   │   │   ├── upload/
│   │   │   ├── dashboard/
│   │   │   └── cron/
│   │   ├── login/
│   │   ├── not-found.tsx
│   │   ├── loading.tsx
│   │   ├── sitemap.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── admin/
│   │   ├── public/
│   │   └── providers.tsx
│   ├── hooks/
│   │   └── useCarStatusUpdates.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── stripe.ts
│   │   ├── mail.ts
│   │   ├── pusher.ts
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── .env.example
├── vercel.json               # Cron config
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Logique métier clé

### Anti double-réservation (atomic)
La réservation utilise une transaction Prisma `$transaction` :
1. Vérifie le statut `AVAILABLE` atomiquement
2. Crée la réservation en `PENDING`
3. Crée la session Stripe
4. Le webhook Stripe confirme et passe le statut à `RESERVED`

Si deux clients tentent simultanément, le second reçoit une erreur 409.

### Expiration automatique (5 jours)
Le cron `/api/cron/check-reservations` tourne toutes les heures :
1. Trouve toutes les réservations `CONFIRMED` expirées
2. Les passe en `EXPIRED` + remet le véhicule en `AVAILABLE`
3. Envoie les emails d'expiration admin + client
4. Broadcast Pusher pour mise à jour temps réel

---

## Commandes utiles

```bash
npm run dev           # Dev server
npm run build         # Build production
npm run db:push       # Push schema sans migration
npm run db:seed       # Seed admin et véhicules
npm run db:studio     # Prisma Studio (UI DB)
npm run db:migrate    # Créer une migration

# Tester le cron en local
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" \
     http://localhost:3000/api/cron/check-reservations
```

---

## Licence

Propriété de LME Occasions. Tous droits réservés.
