# SteinBP — Application de gestion de tournois de beer pong
<p align="center" width="100%">
    <img width="33%" src="logo.png"> 
</p>
## Présentation

**SteinBP** est une application web mobile-first conçue pour organiser et suivre des tournois de beer pong. Elle permet de gérer l'ensemble du cycle de vie d'un tournoi : inscriptions des joueurs, création des tournois, gestion des équipes, saisie des scores en temps réel et consultation du palmarès.

L'application est accessible depuis n'importe quel navigateur et peut être installée sur mobile comme une application native (PWA).

---

## Rôles et accès

L'application repose sur trois niveaux d'accès :

| Rôle | Accès |
|------|-------|
| **Admin** | Tout : joueurs, tournois (tous), palmarès, profil |
| **Organisateur** | Ses propres tournois, palmarès, profil |
| **Joueur** | Son profil, palmarès |

---

## Fonctionnalités par rôle

### Admin
- **Gestion des joueurs** — valider ou refuser les inscriptions, modifier le rôle d'un joueur (admin / organisateur / joueur), supprimer un compte
- **Gestion des tournois** — accès à tous les tournois créés, suppression
- **Création de tournoi** — format élimination directe ou poules + arbre, nombre de tables, gobelets par côté
- **Dashboard en temps réel** — suivi des matchs en cours, assignation des tables, saisie des scores
- **Palmarès global** — classement de toutes les équipes, tri par victoires ou ratio

### Organisateur
- **Création et gestion de ses tournois** — uniquement les tournois qu'il a créés
- **Inscription des équipes** — ajout manuel ou liaison avec des comptes joueurs
- **Suivi en temps réel** — même dashboard que l'admin pour ses tournois
- **Palmarès** — accès en lecture

### Joueur
- **Profil personnalisé** — photo de profil, nom affiché, pseudo
- **Statistiques** — matchs joués/gagnés, taux de victoire, tournois joués/gagnés
- **Historique des tournois** — liste des tournois auxquels il a participé, avec son équipe et le résultat
- **Palmarès** — classement global de toutes les équipes

---

## Formats de tournoi

### Élimination directe
Bracket classique : chaque défaite élimine l'équipe. L'application génère automatiquement l'arbre et gère les équipes "bye" pour les brackets non puissances de 2.

### Poules + arbre final
Phase de groupes avec classement (victoires, différence de gobelets), suivie d'un bracket d'élimination directe. Le nombre de groupes et les équipes qualifiées par groupe sont configurables.

---

## Déroulement d'un tournoi

1. L'organisateur crée le tournoi et configure le format
2. Les équipes sont inscrites (manuellement ou via les comptes joueurs)
3. Le bracket / les groupes sont générés automatiquement
4. Les matchs sont joués ; les scores sont saisis en temps réel depuis le dashboard
5. Le bracket avance automatiquement jusqu'à la finale
6. Le tournoi est clôturé et le palmarès est mis à jour

---

## Écran public

Chaque tournoi dispose d'une **URL publique** (`/display/:id`) affichable sur grand écran ou TV pour suivre le bracket en direct, sans connexion requise.

---

## Installation sur mobile (PWA)

L'application peut être installée directement depuis le navigateur :

**Sur Android (Chrome)**
1. Ouvrir l'app dans Chrome
2. Appuyer sur le menu `⋮` → *Ajouter à l'écran d'accueil*

**Sur iPhone (Safari)**
1. Ouvrir l'app dans Safari
2. Appuyer sur le bouton Partager → *Sur l'écran d'accueil*

Une fois installée, l'app se lance en plein écran sans barre de navigateur, comme une application native.

---

## Inscription des joueurs

Les joueurs s'inscrivent via `/register` (email + mot de passe + pseudo). Le compte est en attente jusqu'à validation par un admin. Une fois approuvé, le joueur accède à son profil et peut être lié à des équipes dans les tournois.

---

## Stack technique

| Élément | Technologie |
|---------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Backend | PocketBase (SQLite + Auth + Storage) |
| Temps réel | PocketBase Realtime (WebSockets) |
| Conteneurisation | Docker + Nginx |
| PWA | vite-plugin-pwa (Workbox) |

---

## Première installation

Au premier démarrage, un compte super-admin PocketBase est automatiquement créé :

| Champ | Valeur |
|-------|--------|
| Email | `little@local.com` |
| Mot de passe | `littlestein` |

Ce compte donne accès au panel d'administration de la base de données sur `http://<votre-serveur>:<APP_PORT>/_/`.

> **Important :** Changez ce mot de passe depuis le panel PocketBase (`/_/` → icône profil) après la première connexion.

### Créer le premier utilisateur admin de l'application

Connectez-vous au panel PocketBase (`/_/`), ouvrez la collection **users** et créez un enregistrement avec les champs suivants :

| Champ | Valeur |
|-------|--------|
| `email` | votre email |
| `password` | votre mot de passe |
| `username` | votre pseudo |
| `display_name` | votre nom affiché |
| `status` | `approved` |
| `role` | `admin` |

### Gérer les utilisateurs suivants

Une fois connecté en tant qu'admin, tous les utilisateurs peuvent être approuvés et leur rôle modifié directement depuis l'interface `/admin` de l'application — plus besoin de passer par PocketBase.

---

## Déploiement

### Sans Traefik — test local

1. Copier le fichier d'environnement et l'éditer :
   ```bash
   cp .env.example .env
   ```
   | Variable | Description |
   |----------|-------------|
   | `APP_PORT` | Port exposé sur la machine hôte (défaut : `80`) |
   | `VITE_POCKETBASE_URL` | URL de l'app accessible depuis le navigateur (ex : `http://localhost`) |

2. Lancer :
   ```bash
   docker compose up -d
   ```

L'application est accessible sur `http://localhost` (ou le port configuré).

---

### Avec Traefik — déploiement production

Prérequis : un réseau Docker externe `traefik` et une instance Traefik en fonctionnement.

1. Copier le fichier d'environnement et l'éditer :
   ```bash
   cp .env.traefik.example .env
   ```
   | Variable | Description |
   |----------|-------------|
   | `APP_NAME` | Nom utilisé pour les routeurs/middlewares Traefik (ex : `steinbp`) |
   | `APP_DOMAIN` | Domaine public de l'application (ex : `steinbp.example.com`) |
   | `VITE_POCKETBASE_URL` | URL publique de l'app (ex : `https://steinbp.example.com`) |
   | `TRAEFIK_CERT_RESOLVER` | Nom du cert resolver Traefik (ex : `letsencrypt`) |
   | `TRAEFIK_SECURED_MIDDLEWARES` | Middlewares du routeur HTTPS — doit toujours inclure `<APP_NAME>-headers@docker` |

2. Lancer :
   ```bash
   docker compose -f docker-compose.traefik.yml up -d
   ```

---

### Mettre à jour PocketBase

La version de PocketBase est définie dans le fichier `.env` via la variable `PB_VERSION`. Pour mettre à jour, modifiez cette valeur puis reconstruisez l'image :

```bash
# Dans .env
PB_VERSION=0.39.0
```

```bash
docker compose build pocketbase
docker compose up -d
```

Les releases disponibles sont listées sur [github.com/pocketbase/pocketbase/releases](https://github.com/pocketbase/pocketbase/releases).

> **Note :** Il est recommandé de consulter le changelog avant de mettre à jour, car certaines versions peuvent introduire des changements incompatibles avec les migrations existantes.
