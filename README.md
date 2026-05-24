# SteinBP — Application de gestion de tournois de beer pong

<p align="center" width="100%">
    <img width="33%" src="logo.png">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-orange?style=flat-square" alt="v2.0" />
  <img src="https://img.shields.io/badge/stack-React%20%2B%20PocketBase-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/deploy-Docker%20%2B%20Traefik-informational?style=flat-square" />
  <img src="https://img.shields.io/badge/PWA-installable-green?style=flat-square" />
</p>

## Présentation

**SteinBP** est une application web mobile-first conçue pour organiser et suivre des tournois de beer pong. Elle gère l'ensemble du cycle de vie d'un tournoi : inscriptions, création des brackets, saisie des scores en temps réel avec règles spéciales, et un **système de progression RPG** complet avec rangs, XP et badges — entièrement personnalisable depuis l'interface d'administration.

L'application est accessible depuis n'importe quel navigateur et peut être installée sur mobile comme une application native (PWA).

---

## Nouveautés v2 🆕

La version 2 introduit un **système de méta-jeu** autour des statistiques des joueurs, avec une expérience de profil entièrement repensée.

### 🎮 Système de progression RPG

Chaque joueur accumule de l'**XP** selon une formule configurable et monte en **rangs** (Recrue, Gobelet, Tankard, Stein, Maître…). La barre de progression et le rang sont visibles directement sur le profil.

### 🏅 Système de badges

27 badges débloquables répartis en 9 catégories, basés sur les statistiques du joueur : matchs joués, matchs gagnés, win rate, tournois, règles spéciales… Chaque badge a un seuil configurable et s'affiche sur le profil du joueur.

### ⚙️ Onglet Custom (admin)

Les admins peuvent **tout personnaliser** sans toucher au code :
- Modifier les rangs (noms, emojis, seuils XP)
- Configurer la formule XP (poids des différentes stats)
- Créer, éditer et supprimer des badges librement
- Réinitialiser rangs et badges indépendamment

### 🎯 Règles spéciales

4 règles de beer pong intégrées à la saisie des scores, qui alimentent directement les statistiques des joueurs :

| Règle | Description |
|-------|-------------|
| **Balls Back** | 2 balles dans des verres différents |
| **Game Over** | 2 balles dans le même verre |
| **Rebond** | Balle qui rebondit avant d'entrer |
| **Trickshot** | Tir avec technique spéciale |

### 🦸 Profil héros

Le profil joueur a été entièrement redesigné dans un style RPG : avatar hexagonal, carte héros, barre XP avec progression vers le rang suivant, grille de badges et statistiques détaillées incluant les règles spéciales.

---

## Rôles et accès

| Rôle | Accès |
|------|-------|
| **Admin** | Tout : joueurs, tournois, palmarès, profil, **onglet Custom** |
| **Organisateur** | Ses propres tournois, palmarès, profil |
| **Joueur** | Son profil, palmarès |

---

## Fonctionnalités

### Admin
- **Gestion des joueurs** — valider ou refuser les inscriptions, modifier le rôle (admin / organisateur / joueur), supprimer un compte
- **Gestion des tournois** — accès à tous les tournois, suppression
- **Création de tournoi** — format élimination directe ou poules + arbre, nombre de tables, gobelets par côté
- **Dashboard en temps réel** — suivi des matchs, assignation des tables, saisie des scores avec règles spéciales
- **Palmarès global** — classement de toutes les équipes
- **Onglet Custom** — personnalisation complète du système RPG (rangs, XP, badges)

### Organisateur
- **Création et gestion de ses tournois**
- **Inscription des équipes** — ajout manuel ou liaison avec des comptes joueurs
- **Suivi en temps réel** — même dashboard que l'admin pour ses tournois
- **Palmarès** — accès en lecture

### Joueur
- **Profil héros** — avatar hexagonal, rang actuel, barre de progression XP
- **Statistiques complètes** — matchs joués/gagnés, win rate, tournois, règles spéciales (Balls Back, Rebonds, Trickshots, Game Over)
- **Collection de badges** — badges débloqués mis en avant, badges verrouillés en grisé
- **Historique des tournois** — liste des participations avec équipe et résultat
- **Palmarès** — classement global de toutes les équipes

---

## Système RPG

### XP et rangs

L'XP d'un joueur est calculée selon une formule pondérée, configurable depuis l'onglet Custom :

```
XP = (matchs joués × poids_1) + (matchs gagnés × poids_2) + (tournois gagnés × poids_3)
```

Les rangs par défaut :

| Rang | Emoji | XP minimum |
|------|-------|-----------|
| Recrue | 🍺 | 0 |
| Gobelet I | 🥤 | 5 |
| Gobelet II | 🥤 | 10 |
| Tankard I | 🍻 | 20 |
| Tankard II | 🍻 | 35 |
| Stein I | 🏆 | 50 |
| Stein II | 🏆 | 75 |
| Maître | 👑 | 100 |

### Badges (27 par défaut)

| Catégorie | Badges |
|-----------|--------|
| Matchs joués | 🎯 Sniper · 🎮 Habitué · ⚔️ Guerrier · 🌟 Légende |
| Matchs gagnés | 🥇 Vainqueur · 💪 Dominant · 👑 Roi de la table |
| Win rate | 🎲 Tacticien · ⚡ Implacable · 🔮 Prophète |
| Tournois joués | 🍺 Vétéran · 🎖️ Compétiteur · 🌍 Pro |
| Tournois gagnés | 🏆 Conquérant · 💀 Inarrêtable |
| Balls Back | 🔄 Boomerang · 🌀 Retour de flamme · 🧲 Maître du retour |
| Rebonds | 🏓 Rebondisseur · 🦘 Kangourou · 🎯 Maestro |
| Trickshots | 🎪 Showman · 🤹 Acrobate · 🎩 Magicien |
| Game Over | 💥 Double Balle · 💣 Destructeur · ☠️ Terminator |

> Tous les noms, emojis, seuils et catégories sont modifiables depuis l'onglet **Custom**.

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
4. Les matchs sont joués ; les scores sont saisis en temps réel depuis le dashboard (avec règles spéciales)
5. Le bracket avance automatiquement jusqu'à la finale
6. Le tournoi est clôturé, le palmarès est mis à jour et les statistiques joueurs sont recalculées

---

## Écran public

Chaque tournoi dispose d'une **URL publique** affichable sur grand écran ou TV pour suivre le bracket en direct, sans connexion requise.

### Obtenir le lien

Depuis le dashboard d'un tournoi, un bouton **📺 Lien TV** est disponible en haut à droite du header. Un clic copie automatiquement l'URL dans le presse-papier.

### Format de l'URL

L'application utilisant un HashRouter, l'URL a toujours la forme :

```
https://votre-domaine/#/display/<id-du-tournoi>
```

> ⚠️ Le `#` est obligatoire — sans lui, Nginx reçoit la requête directement et retourne une erreur 404. Utilisez toujours le bouton **📺 Lien TV** du dashboard pour éviter cette confusion.

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

## Sécurité

### 1. Changer les credentials par défaut

Après la première connexion, modifiez immédiatement le compte superadmin créé automatiquement (`little@local.com` / `littlestein`) :

- Dans le panel PocketBase (`/_/`) → icône profil (bas à gauche) → **"Edit profile"**
- Changez l'email et le mot de passe

### 2. Activer le MFA sur le superadmin PocketBase

Le panel `/_/` donne un accès total à la base de données. Il est fortement recommandé d'y activer l'authentification à deux facteurs (TOTP) :

1. Connectez-vous au panel PocketBase (`/_/`)
2. Cliquez sur l'icône profil en bas à gauche
3. Sélectionnez **"Two-factor authentication"**
4. Scannez le QR code avec une application TOTP (Google Authenticator, Authy, 2FAS…)
5. Confirmez avec le code généré

À partir de ce moment, chaque connexion au panel demande le code TOTP en plus du mot de passe.

### 3. Restreindre l'accès au panel d'administration

Une fois la configuration initiale terminée, il est conseillé de bloquer l'accès public à `/_/`. Modifiez `nginx.conf` pour le restreindre à votre réseau local :

```nginx
location ~ ^/_/ {
    allow 192.168.1.0/24;  # adaptez à votre réseau local
    deny all;
    proxy_pass http://pocketbase:8090;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Puis reconstruisez l'image : `docker compose build steinbp && docker compose up -d`

### 4. Sauvegarder les données régulièrement

Toutes les données sont dans le volume Docker `pocketbase_data`. Pour faire une sauvegarde :

```bash
docker run --rm \
  -v steinbp-public_pocketbase_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/pocketbase_backup_$(date +%Y%m%d).tar.gz -C /data .
```

Automatisez cette commande via un cron job sur votre serveur.

### 5. Maintenir PocketBase à jour

Les mises à jour de PocketBase corrigent régulièrement des failles de sécurité. Consultez les [releases](https://github.com/pocketbase/pocketbase/releases) et mettez à jour `PB_VERSION` dans votre `.env` dès qu'une nouvelle version est disponible.

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
| Reverse proxy | Traefik (optionnel, production) |

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

Une fois connecté en tant qu'admin, tous les utilisateurs peuvent être approuvés et leur rôle modifié directement depuis l'interface de l'application — plus besoin de passer par PocketBase.

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
   | `VITE_POCKETBASE_URL` | URL publique de l'app avec `https://` (ex : `https://steinbp.example.com`) |
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

---

## Changelog

### v2.0
- ✨ Système de progression RPG (XP, rangs, barre de progression)
- 🏅 27 badges débloquables répartis en 9 catégories
- ⚙️ Onglet Custom : personnalisation complète des rangs, de la formule XP et des badges depuis l'UI
- 🎯 Règles spéciales intégrées à la saisie des scores (Balls Back, Game Over, Rebond, Trickshot)
- 🦸 Profil joueur entièrement redesigné (style RPG, avatar hexagonal, statistiques détaillées)
- 🔄 Badges groupés par catégorie et triés par seuil dans l'interface admin
- 📺 Bouton "Lien TV" dans le dashboard pour copier l'URL de l'écran public en un clic
- 🖼️ Logo officiel affiché sur l'écran public (remplacement de l'emoji 🏓)

### v1.0
- 🏆 Gestion de tournois (élimination directe, poules + arbre)
- 👥 Système de rôles (admin, organisateur, joueur)
- 📊 Palmarès global et statistiques de base
- 📺 Écran public en temps réel (`/display/:id`)
- 📱 Installation PWA
