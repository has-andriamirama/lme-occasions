# LME Occasions - Plateforme de Gestion de Vente de Voitures d'Occasion

LME Occasions est une solution web complète de niveau entreprise destinée à la vente de véhicules d'occasion haut de gamme. Conçue avec l'architecture App Router de Next.js 14, TypeScript et Prisma, cette plateforme offre un espace d'administration sécurisé, un système de réservation temps réel robuste, des paiements en ligne intégrés via Stripe, ainsi qu'une génération automatisée de factures au format PDF stockées sur Cloudinary.

## Stack Technique

La plateforme s'appuie sur un ensemble de technologies modernes et éprouvées :

- Framework : Next.js 14 (App Router) avec support natif du Server-side Rendering (SSR) et des React Server Components (RSC).
- Langage : TypeScript pour un typage statique rigoureux et une maintenabilité optimale du code.
- Design et Styles : Tailwind CSS avec un thème sombre premium personnalisé.
- Persistance des Données : Base de données relationnelle PostgreSQL, interrogée via le puissant ORM Prisma.
- Authentification : NextAuth.js v4 pour une gestion sécurisée des sessions avec jetons JWT.
- Services de Paiement : Stripe Checkout et traitement asynchrone sécurisé via les Webhooks Stripe.
- Messagerie Électronique : Nodemailer pour l'envoi d'e-mails transactionnels (SMTP).
- Communication Temps Réel : Pusher Channels pour la synchronisation instantanée de l'état des véhicules.
- Stockage Nuagique : Cloudinary pour l'hébergement hautement disponible des photographies de véhicules et des factures au format PDF.
- Tâches Planifiées : Vercel Cron Jobs pour l'expiration automatique et récurrente des réservations.

## Fonctionnalités Principales

### Interface Publique Client

L'espace public propose une expérience utilisateur fluide, immersive et rassurante :

- Page d'accueil : Présentation haut de gamme de la marque avec un héros animé, une vitrine des véhicules vedettes et des animations de transition fluides.
- Catalogue Dynamique : Moteur de recherche avancé avec filtres multiples (marque, boîte de vitesses, type de carburant, année, kilométrage maximal, fourchette de prix, statut de disponibilité) et options de tri sélectif.
- Fiche de Détail du Véhicule : Galerie de photos interactive avec support du balayage, liste des équipements, spécifications techniques exhaustives et état général.
- Système de Réservation Atomique : Verrouillage immédiat du véhicule en temps réel pour empêcher les doubles réservations concurrentes. Paiement sécurisé d'un acompte de 30% via Stripe Checkout.
- Temps Réel Pusher : Mise à jour instantanée des fiches techniques et des statuts des véhicules (disponible, réservé, vendu) sans rafraîchissement manuel de la page.
- Newsletter : Popup d'inscription à la newsletter avec détection automatique de la visite.
- Contact Professionnel : Formulaire de contact avec protection antispam honeypot et limitation de débit (rate limiting) pour assurer la sécurité du serveur de messagerie.
- Mentions Légales : Pages de conformité réglementaire (Conditions Générales de Vente, Politique de Confidentialité, Mentions Légales).

### Interface d'Administration Sécurisée

L'espace d'administration offre un tableau de bord puissant pour superviser l'ensemble de l'activité commerciale :

- Dashboard et Indicateurs Clés : Visualisation en temps réel des statistiques clés (revenus totaux, volume de ventes, taux de réservation, état du parc automobile, messages en attente).
- Gestion du Parc Automobile (CRUD) : Interface complète de création, modification et suppression de fiches de véhicules (caractéristiques techniques, équipements, images, mise en avant).
- Gestion des Offres Commerciales : Création de campagnes promotionnelles ciblant certains véhicules ou l'intégralité du parc, avec application de remises en pourcentage ou en montant fixe, et gestion de périodes de validité.
- Gestion des Réservations : Suivi des réservations clients, mise à jour des statuts, gestion des règlements de solde, annulation manuelle ou finalisation de vente.
- Facturation Automatisée : Génération automatique de factures PDF d'acompte et de solde basées sur un modèle professionnel standardisé. Les factures sont automatiquement stockées de manière persistante sur Cloudinary et associées à un numéro séquentiel unique par année.
- Journal d'Audit et Sécurité : Traçabilité exhaustive de l'activité administrative. Toutes les actions sensibles effectuées par les administrateurs (connexions, modifications de prix, suppressions) sont consignées dans un journal d'audit immuable.
- Protection Brute-Force : Blocage temporaire automatique des adresses IP après 5 tentatives infructueuses de connexion sous 15 minutes.
- Gestion Multi-Admins : Création et désactivation de comptes d'administrateurs sous le contrôle exclusif du rôle Super Admin.

## Architecture de la Base de Données

Le schéma de base de données PostgreSQL est structuré pour garantir l'intégrité référentielle et la cohérence de l'historique d'achat :

- Admin : Représente les utilisateurs de l'espace d'administration avec gestion de rôles (SUPER_ADMIN, ADMIN).
- Car : Contient toutes les propriétés des véhicules (marque, modèle, prix, kilométrage, boîte, carburant, équipements, statut).
- Offer : Définit les campagnes de réductions et de promotions.
- CarOffer : Table de jointure modélisant la relation plusieurs-à-plusieurs entre les véhicules et les offres promotionnelles.
- Reservation : Représente l'engagement d'achat d'un client avec statut (PENDING, PAID, CONFIRMED, COMPLETED, EXPIRED, CANCELLED), prix final, acompte versé et date d'expiration.
- BalancePayment : Gère le solde restant à payer en agence pour chaque réservation.
- Invoice : Enregistre les factures générées (type d'acompte ou de totalité) avec lien URL persistant.
- InvoiceCounter : Assure la génération séquentielle et sans collision des numéros de factures à chaque nouvelle année civile.
- Contact : Archive les messages envoyés depuis le formulaire de contact public.
- Newsletter : Enregistre les inscriptions des abonnés à la liste de diffusion.
- AuditLog : Consigne l'intégralité des actions administratives.
- LoginAttempt : Historise les tentatives d'authentification pour la prévention des attaques par force brute.

## Installation et Configuration en Local

### Prérequis Système

Pour faire fonctionner l'application en local, vous devez disposer de :
- Node.js version 18 ou supérieure.
- Une instance PostgreSQL accessible.
- Un compte Stripe pour les paiements d'acompte.
- Un compte Pusher pour les notifications en temps réel.
- Un compte Cloudinary pour le stockage des médias et des PDFs.
- Un serveur SMTP (Gmail, SendGrid, Resend ou Mailtrap) pour l'envoi d'e-mails transactionnels.

### 1. Cloner le Dépôt et Installer les Dépendances

Clonez le dépôt de l'application et installez les modules nécessaires :

```bash
git clone https://github.com/votre-compte/lme-occasions.git
cd lme-occasions
npm install
```

### 2. Configuration des Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet en vous basant sur le modèle `.env.example`. Renseignez les variables d'environnement indispensables :

```env
# Base de Données Relationnelle
DATABASE_URL="postgresql://utilisateur:mot_de_pass@hôte:5432/nom_db"

# Configuration NextAuth (Générer une clé robuste : openssl rand -base64 32)
NEXTAUTH_SECRET="votre_secret_nextauth_de_32_caractères"
NEXTAUTH_URL="http://localhost:3000"

# Intégration Stripe (Clés de test)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Serveur de Messagerie SMTP (Transactionnel)
SMTP_HOST="smtp.votre-fournisseur.com"
SMTP_PORT="587"
SMTP_USER="votre-identifiant"
SMTP_PASS="votre-mot-de-passe"
ADMIN_EMAIL="notifications@lmeoccasions.com"

# Configuration Pusher (Notifications temps réel)
PUSHER_APP_ID="votre_app_id"
PUSHER_KEY="votre_key"
PUSHER_SECRET="votre_secret"
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="votre_key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# Configuration Cloudinary (Hébergement d'images et PDF)
CLOUDINARY_CLOUD_NAME="votre_cloud_name"
CLOUDINARY_API_KEY="votre_api_key"
CLOUDINARY_API_SECRET="votre_api_secret"

# Vercel Cron Secret (Sécurité de l'endpoint cron)
CRON_SECRET="votre_secret_cron"
```

### 3. Initialisation de la Base de Données

Poussez le schéma de base de données à l'aide de Prisma, puis exécutez le script d'initialisation (seed) pour créer les comptes de test et des exemples de véhicules :

```bash
# Appliquer le schéma de la base de données
npx prisma db push

# Peupler la base de données avec les données de test indispensables
npm run db:seed
```

Le script de peuplement va générer un administrateur par défaut avec les identifiants de connexion suivants :
- Identifiant de connexion : admin
- Mot de passe temporaire : admin

### 4. Démarrage de l'Application en Mode Développement

Lancez le serveur de développement local :

```bash
npm run dev
```

L'interface utilisateur est alors disponible à l'adresse : http://localhost:3000
L'écran de connexion à l'administration est accessible sur : http://localhost:3000/login

Au premier accès avec le compte admin par défaut, l'application vous redirigera automatiquement vers un formulaire sécurisé vous forçant à définir un mot de passe personnalisé robuste avant de pouvoir accéder au tableau de bord.

## Logiques Métier Clés

### Protection contre les Doubles Réservations

Pour éliminer tout risque de double vente simultanée d'un même véhicule, l'application implémente une logique transactionnelle stricte au niveau de la base de données via Prisma :

1. L'appel de l'API de réservation initie une transaction SQL atomique.
2. Le statut actuel du véhicule est vérifié. S'il n'est pas strictement égal à AVAILABLE, la transaction est instantanément avortée et l'API renvoie un code de statut HTTP 409 (Conflit).
3. Si le véhicule est disponible, son statut passe immédiatement à PENDING et une session Stripe Checkout unique est créée.
4. Si le paiement réussit, le webhook Stripe met à jour la réservation vers PAID/CONFIRMED et verrouille définitivement le véhicule sur RESERVED.
5. Si la session Stripe expire ou échoue, le webhook remet instantanément le véhicule à l'état AVAILABLE.

### Tâche Planifiée Cron d'Expiration

Pour éviter l'immobilisation indue de véhicules par des réservations impayées ou abandonnées, une tâche cron tourne toutes les heures en appelant l'endpoint `/api/cron/check-reservations`. Sa logique est la suivante :

1. Identification de toutes les réservations d'acompte confirmées depuis plus de 5 jours ouvrés.
2. Mise à jour automatique de ces réservations au statut EXPIRED.
3. Rétablissement instantané du véhicule associé à l'état disponible (AVAILABLE) pour réintégration immédiate au catalogue de vente.
4. Envoi automatique de notifications par e-mail d'expiration à l'acheteur ainsi qu'à l'équipe d'administration.
5. Notification asynchrone Pusher pour libérer le véhicule sur l'interface de tous les clients connectés au catalogue.

## Commandes Utiles

Les scripts principaux définis dans le projet facilitent l'exploitation et la maintenance de la plateforme :

```bash
# Démarrer le serveur local en mode développement
npm run dev

# Compiler l'application Next.js pour la production
npm run build

# Démarrer l'application Next.js compilée en mode production
npm run start

# Lancer la validation du schéma Prisma local
npx prisma validate

# Ouvrir l'outil d'administration visuel Prisma Studio
npx prisma studio

# Déclencher manuellement l'exécution du cron d'expiration en local
curl -H "Authorization: Bearer votre_secret_cron" http://localhost:3000/api/cron/check-reservations
```

## Licence

Propriété exclusive de EXXE. Tous droits réservés.
