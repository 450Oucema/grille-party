# Grille Party 🎮

Clone local du jeu **Boggle Party** (Netflix Games), jouable en réseau local sans connexion internet. Un écran principal sur TV/ordinateur, les joueurs rejoignent depuis leur téléphone via QR code.

---

## Fonctionnement

```
[TV / Écran principal]  →  http://localhost:5173
        ↑  Socket.IO  ↓
[Serveur Node.js]  :3035
        ↑  Socket.IO  ↓
[Téléphones joueurs]  →  http://<ip-locale>:5173/join/CODE
```

1. L'hôte ouvre `http://localhost:5173` sur l'écran TV
2. Il clique **Créer une partie** et configure la grille (4×4 ou 6×6) et la durée
3. Les joueurs scannent le QR code ou saisissent le code court
4. L'hôte lance la partie — tout le monde reçoit la même grille
5. Chaque joueur tape ou **glisse** ses mots sur son téléphone
6. À la fin : cinématique animée sur la TV avec comparaison des mots, comptage des scores et classement

---

## Installation

### Prérequis

- Node.js ≥ 18
- npm ≥ 9

### Setup

```bash
git clone <repo>
cd boggle-party
npm install
cp .env.example .env
```

---

## Utilisation

### Mode développement (avec hot-reload)

```bash
npm run dev
```

- TV/écran : `http://localhost:5173`
- Téléphones (même réseau WiFi) : `http://<ton-ip>:5173/join/CODE`

> Ton IP locale : `ipconfig getifaddr en0` (Mac) ou `hostname -I` (Linux)

### Mode production

```bash
npm run build
npm run start
```

Le backend tourne sur `127.0.0.1:3035`. Le frontend compilé est servi par nginx.

---

## Variables d'environnement

```env
# .env
NODE_ENV=production
HOST=127.0.0.1
PORT=3035
SOCKET_PATH=/g/grille-party/socket.io
VITE_BASE_PATH=/g/grille-party/
VITE_BACKEND_PORT=3035
VITE_SOCKET_PATH=/g/grille-party/socket.io
```

---

## Règles du jeu

### Grille

- **4×4** (16 cases) ou **6×6** (36 cases) — configurable par l'hôte
- Lettres générées par des dés pondérés fréquence française
- La case **Qu** compte comme 2 lettres

### Mots valides

- Minimum **3 lettres**
- Doivent être constructibles en suivant des cases **adjacentes** (horizontal, vertical, diagonal)
- Chaque case ne peut être utilisée **qu'une seule fois** par mot
- Présents dans le **dictionnaire français** (201 000+ mots, accents normalisés)
- Pas d'apostrophes, pas de tirets
- Pluriels et conjugaisons acceptés

### Scoring

| Longueur | Points |
|----------|--------|
| 3 lettres | 3 pts |
| 4 lettres | 4 pts |
| 5 lettres | 5 pts |
| 6 lettres | 6 pts |
| N lettres | N pts |

> **Formule :** `3 + max(0, longueur - 3)`

- Si un mot est trouvé par **2 joueurs ou plus** → **0 point** pour tout le monde sur ce mot
- Un joueur ne peut pas soumettre deux fois le même mot

### Durée

Configurable par l'hôte : **2 min**, **3 min** (défaut), ou **5 min**.

---

## Fin de partie — Cinématique TV

À l'expiration du chrono, l'écran TV lance automatiquement :

1. **⏰ TEMPS ÉCOULÉ !** — flash animé
2. **Comparaison des mots** — révélation mot par mot avec score ou `ANNULÉ` si doublon
3. **Comptage des scores** — animation de montée des points
4. **🏆 Classement final** — podium avec 🥇🥈🥉 et meilleur mot de chaque joueur

---

## Saisie des mots (mobile)

Deux méthodes :

- **Glisser** : appuyer sur une lettre et glisser vers les cases adjacentes — relâcher pour valider
- L'ordre de sélection s'affiche sur chaque case (numéro)

Feedbacks :
- Vert → mot accepté
- Rouge → refusé (hors dictionnaire, impossible dans la grille, trop court…)
- Gris barré → déjà envoyé

---

## Architecture

```
boggle-party/
├── package.json            # Monorepo (npm workspaces)
├── .env.example
├── server/
│   └── src/
│       ├── index.ts        # Express + Socket.IO, événements
│       ├── rooms.ts        # Gestion des salles en mémoire
│       ├── game.ts         # Logique start/end de partie
│       ├── grid.ts         # Génération grille + validation chemin
│       ├── dictionary.ts   # Chargement et normalisation du dictionnaire
│       ├── scoring.ts      # Calcul scores + détection doublons
│       └── types.ts        # Types partagés serveur
└── client/
    └── src/
        ├── App.tsx
        ├── socket.ts       # Instance Socket.IO client
        ├── types.ts        # Types partagés client
        ├── pages/
        │   ├── HostPage.tsx        # Accueil + création de salle
        │   ├── JoinPage.tsx        # Rejoindre via code/QR
        │   └── RoomPage.tsx        # Vue TV (lobby/jeu/résultats) + vue mobile
        └── components/
            ├── Board.tsx           # Grille affichage (TV)
            ├── DraggableBoard.tsx  # Grille interactive glisser (mobile)
            ├── Timer.tsx           # Compte à rebours animé
            ├── PlayerList.tsx      # Liste des joueurs
            ├── QRJoin.tsx          # QR code + URL de rejointe
            ├── ResultsTable.tsx    # Tableau résultats (mobile)
            └── ResultsCinematic.tsx # Cinématique fin de partie (TV)
```

---

## Événements Socket.IO

### Client → Serveur

| Événement | Payload | Description |
|-----------|---------|-------------|
| `room:create` | — | Crée une nouvelle salle |
| `room:sync` | `{ roomCode, playerId? }` | Demande l'état courant (reconnexion) |
| `room:join` | `{ roomCode, playerName }` | Rejoindre une salle |
| `room:settings` | `{ roomCode, gridSize?, durationSec? }` | Modifier les paramètres (hôte) |
| `room:start` | `{ roomCode }` | Lancer la partie (hôte) |
| `room:restart` | — | Revenir en lobby (hôte) |
| `word:submit` | `{ roomCode, playerId, word }` | Soumettre un mot |

### Serveur → Client

| Événement             | Payload            | Description                         |
|-----------------------|--------------------|-------------------------------------|
| `room:created`        | `{ roomCode }`     | Salle créée                         |
| `room:state`          | `PublicRoom`       | État complet de la salle            |
| `player:state`        | `{ id, words[] }`  | État privé du joueur                |
| `game:started`        | `{ grid, endsAt }` | Partie lancée                       |
| `game:ended`          | `{ results[] }`    | Fin de partie avec résultats        |
| `word:accepted-local` | `{ word }`         | Mot validé (format + dico + grille) |
| `word:rejected-local` | `{ word, reason }` | Mot refusé                          |
| `error`               | `{ message }`      | Erreur générique                    |

---

## Tests

```bash
npm test
```

28 tests unitaires couvrant :
- Normalisation des accents (`é→E`, `ç→C`, `œ→OE`…)
- Validation dictionnaire
- Génération de grille (4×4 et 6×6)
- Validation de chemin (adjacence, non-réutilisation, case `QU`)
- Scoring
- Détection et annulation des doublons

---

## Déploiement production actuel

URL : `https://oucema.fr/g/grille-party/`

- Frontend Vite : `/var/www/oucema.fr/current/g/grille-party/`
- Backend Socket.IO : `127.0.0.1:3035`
- Socket.IO public : `/g/grille-party/socket.io`
- Healthcheck : `https://oucema.fr/g/grille-party/health`
- Process manager : PM2 app `grille-party`

### Build + publication frontend

```bash
npm run build
sudo mkdir -p /var/www/oucema.fr/current/g/grille-party
sudo rsync -a --delete client/dist/ /var/www/oucema.fr/current/g/grille-party/
```

### PM2

```bash
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

### nginx

Dans le server block `oucema.fr` :

```nginx
location = /g/grille-party/health {
    proxy_pass http://127.0.0.1:3035/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /g/grille-party/socket.io {
    proxy_pass http://127.0.0.1:3035;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}

location ^~ /g/grille-party/ {
    try_files $uri $uri/ /g/grille-party/index.html;
}
```

### Vérification

```bash
npm run test
npm run lint
npm run build
curl -fsS http://127.0.0.1:3035/health
curl -fsS https://oucema.fr/g/grille-party/health
curl -fsS 'https://oucema.fr/g/grille-party/socket.io/?EIO=4&transport=polling'
```

---

## Limites techniques

| Contrainte               | Valeur                    |
|--------------------------|---------------------------|
| Joueurs max par salle    | 12                        |
| Mots max par joueur      | 500                       |
| Salles en mémoire        | nettoyées après 2h        |
| Rate limit `word:submit` | 5 requêtes/seconde/socket |

---

## Stack

| Couche | Techno |
|--------|--------|
| Serveur | Node.js 18+, Express, Socket.IO 4 |
| Client | React 18, Vite 5, TypeScript |
| Style | TailwindCSS 3 |
| Dictionnaire | `an-array-of-french-words` (201k mots) |
| QR code | `qrcode.react` |
| Tests | Vitest |
