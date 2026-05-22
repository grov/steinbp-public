# SteinBP — Application de gestion de tournois de beer pong

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
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Temps réel | Supabase Realtime (WebSockets) |
| Hébergement | SteinLab (Docker) |
| PWA | vite-plugin-pwa (Workbox) |
