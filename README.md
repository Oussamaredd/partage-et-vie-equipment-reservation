# Equipment Reservation (Symfony + Vue)

Petit systeme de reservation de materiel realise pour un test technique Symfony/JS.

## GUIDE
Voici le guide pratique, de A a Z, pour utiliser le projet rapidement.

- Commencez a la racine du repository.
- Choisissez un mode d'execution: Docker (recommande pour la stabilite) ou Local (process natifs pour iterer vite).
- Demarrez les services, ouvrez l'application, authentifiez-vous, creez des reservations, puis lancez les tests selon le besoin.
- Utilisez les commandes de reset uniquement si vous voulez nettoyer l'etat local et repartir proprement.

| Commande | Usage |
| --- | --- |
| `npm run docker:up` | Commande recommandee pour commencer: demarre API + frontend en Docker et attend les health checks. |
| `npm run docker:down` | Arrete proprement les services Docker a la fin de votre session. |
| `npm run docker:logs` | Stream les logs Docker pour diagnostiquer les problemes de demarrage ou d'execution. |
| `npm run docker:status` | Affiche l'etat des services/process et les verifications runtime utiles. |
| `npm run docker:doctor` | Verifie les prerequis outillage et la disponibilite des ports avant lancement. |
| `npm run docker:reset` | Nettoyage local destructif en mode Docker (reset DB/cache/process). |
| `npm run local:up` | Demarre API + frontend en process locaux en arriere-plan avec suivi PID. |
| `npm run local:down` | Arrete les process demarres via `local:up`. |
| `npm run local:logs` | Lit les logs locaux dans `.dev/logs` (API + frontend). |
| `npm run local:status` | Affiche la sante du mode local, les PID actifs et les ports occupes. |
| `npm run local:reset` | Nettoyage local destructif en mode natif. |
| `npm run dev -- up` | Wrapper direct (usage avance) equivalent a Docker up. |
| `npm run dev -- local up` | Wrapper direct (usage avance) equivalent a Local up. |
| `cd api && php bin/phpunit` | Lance les tests backend avec PHPUnit. |
| `cd frontend && npm run test:unit` | Lance les tests unitaires frontend avec Vitest. |
| `cd frontend && npm run test:e2e` | Lance la suite Playwright E2E mockee (rapide). |
| `cd frontend && npm run test:e2e:smoke` | Lance les checks E2E smoke contre le vrai backend. |
| `cd frontend && npm run test:e2e:all` | Lance les suites E2E mockee + smoke backend reel. |

Apres demarrage, ouvrez `http://localhost:5173` pour l'UI et utilisez `http://localhost:8000` pour l'API.

Comptes TEST dev:
- Compte 1: `employee@company.test` / `ChangeMe123`
- Compte 2: `employee2@company.test` / `ChangeMe123`

## Environment Setup (Nouveaux contributeurs)
Pour un nouvel utilisateur GitHub/repo, suivez ces etapes avant le premier lancement.

| Etape | Description |
| --- | --- |
| 1. Cloner le repository | `git clone <repo-url>` puis `cd partage-et-vie-equipment-reservation`. |
| 2. Pre-requis | Installer Node.js 22+, npm, PHP 8.2+, Composer. Docker Desktop est recommande pour un setup rapide. |
| 3. Creer les fichiers env locaux | Copier `api/.env.example` vers `api/.env` et `api/.env.dev.example` vers `api/.env.dev`. |
| 4. Definir les secrets locaux | Renseigner `APP_SECRET` et `APP_JWT_SECRET` dans `api/.env.dev` (valeurs locales uniquement). |
| 5. Lancer le projet | Option recommandee: `npm run docker:up` depuis la racine. |
| 6. Charger les fixtures | `cd api && php bin/console doctrine:fixtures:load --no-interaction` pour injecter les comptes de test et les donnees demo. |
| 7. Verification rapide | Ouvrir `http://localhost:5173`, se connecter avec un compte fixture, puis creer une reservation. |

Exemple de generation de secret local:
```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Copie des fichiers env (exemples):
```bash
cp api/.env.example api/.env
cp api/.env.dev.example api/.env.dev
```

PowerShell (Windows):
```powershell
Copy-Item api/.env.example api/.env
Copy-Item api/.env.dev.example api/.env.dev
```

Regle importante: ne committez jamais `api/.env`, `api/.env.dev` ou tout fichier contenant des secrets reels.

## Objectif
- Gerer les reservations de materiel.
- Appliquer la regle metier principale: un meme equipement ne peut pas etre reserve par deux utilisateurs sur des dates qui se chevauchent.
- Fournir un formulaire de reservation asynchrone avec messages de succes/erreur explicites.

## Stack
- Backend API: Symfony 7 + Doctrine ORM
- Database: SQLite
- Frontend: Vue 3 + Vite
- Backend tests: PHPUnit
- Frontend unit tests: Vitest
- E2E tests: Playwright
- Containers: Docker + Docker Compose

## Documentation
- `docs/implementation-plan.md`: plan d'implementation et decisions d'architecture.
- `docs/implementation-tasks.md`: checklist d'execution derivee du plan.

## Structure DDD
- `api/src/Auth/Domain`: `User`, `PasswordResetToken`, auth repository interfaces, auth exceptions.
- `api/src/Auth/Application`: use cases (`Signup`, `Login`, `RequestPasswordReset`, `ResetPassword`).
- `api/src/Auth/Infrastructure`: JWT manager, password hasher, auth middleware, auth controllers.
- `api/src/Equipment/Domain`: `Equipment` aggregate + repository interface.
- `api/src/Reservation/Domain`: `Reservation` aggregate + domain exceptions + repository interface.
- `api/src/Reservation/Application`: reservation use cases (`CreateReservation`, `ListReservations`) + DTOs.
- `api/src/Shared/Infrastructure/Persistence/Doctrine`: Doctrine repository implementations.
- `api/src/Reservation/Infrastructure/Http`: thin Symfony controllers.

## API Endpoints
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/equipment`
- `POST /api/reservations`
- `GET /api/reservations`

Les endpoints reservation necessitent `Authorization: Bearer <token>`.

## Setup Local

### Commandes Developpeur Unifiees
Les scripts sont centralises dans `infra/scripts` et executes depuis la racine via les scripts `package.json`.

Depuis la racine du repository (Linux/macOS/Windows):
```bash
npm run docker:up
npm run docker:down
```

Mode local natif depuis la racine du repository:
```bash
npm run local:up
npm run local:down
```

Execution directe du script (fallback optionnel):
```powershell
node infra/scripts/dev.mjs up
node infra/scripts/dev.mjs local up
```

Reference commandes:
`dev` ci-dessous mappe vers `node infra/scripts/dev.mjs` (ou `npm run dev -- <args>`).

Raccourcis frequents a la racine:
- `npm run docker:up`
- `npm run docker:down`
- `npm run local:up`
- `npm run local:down`
- `npm run docker:status`
- `npm run local:status`

| Commande | Description |
| --- | --- |
| `dev up` | Demarre la stack Docker (`api` + `frontend`) et attend les health checks. |
| `dev down` | Arrete la stack Docker. |
| `dev logs [api\|frontend]` | Stream les logs Docker (tous les services par defaut). |
| `dev status` | Affiche le statut Docker et mode local. |
| `dev doctor` | Verifie les prerequis et affiche la disponibilite des ports. |
| `dev reset --yes` | Reset l'etat DB/cache/process en local (nettoyage destructif). |
| `dev local up` | Demarre API + frontend natifs en arriere-plan avec suivi PID. |
| `dev local down` | Arrete les process locaux demarres par `dev local up`. |
| `dev local logs [api\|frontend\|all] [--follow]` | Lit les logs locaux dans `.dev/logs`. |
| `dev local status` | Affiche la sante des process locaux, PID et ports. |
| `dev local reset --yes` | Meme nettoyage que `dev reset --yes`. |

### Fallback manuel (sans commande `dev`)
Backend API:
```bash
cd api
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
php -S 127.0.0.1:8000 -t public
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Le frontend utilise le proxy Vite pour router `/api` vers `http://localhost:8000` en environnement de dev.

## Authentication
- Endpoint signup: `POST /api/auth/signup`
- Endpoint login: `POST /api/auth/login`
- Endpoint forgot-password: `POST /api/auth/forgot-password`
- Endpoint reset-password: `POST /api/auth/reset-password`
- Le frontend stocke le JWT dans `localStorage` et envoie le bearer token pour les requetes de reservation.
- En dev, la reponse forgot-password peut inclure `resetToken` pour faciliter les tests locaux.
- Comptes TEST dev (fixtures):
  - Compte 1: `employee@company.test` / `ChangeMe123`
  - Compte 2: `employee2@company.test` / `ChangeMe123`

## Frontend Routing
- `/login`
- `/signup`
- `/forgot-password`
- `/reservations/new` (protected)
- `/reservations` (protected)

## Frontend Architecture
- `frontend/src/app`: bootstrap applicatif, router et styles globaux.
- `frontend/src/shared`: briques techniques reutilisables (`api`, helpers storage, UI partagee).
- `frontend/src/features/auth`: API auth, state model, formulaires et pages.
- `frontend/src/features/equipment`: API equipements + loading model.
- `frontend/src/features/reservations`: API reservations, models, UI et pages.
- `frontend/tests`: tous les tests frontend au meme endroit (`unit`, `component`, `e2e`).

## Database and Fixtures
- URL DB par defaut: `api/.env` utilise SQLite (`database/sqlite/data.db`).
- URL DB de test: `api/.env.test` utilise SQLite (`database/sqlite/data_test.db`).
- Les migrations Doctrine sont stockees dans `database/migrations`.
- Les fixtures (`AppFixtures`) injectent 3 equipements, 2 comptes auth locaux et des reservations de demonstration.

Comptes TEST dev (after fixtures load):
- Compte 1: `employee@company.test` / `ChangeMe123`
- Compte 2: `employee2@company.test` / `ChangeMe123`

Note securite:
- Pensez a faire tourner les secrets JWT/app et a desactiver l'exposition du reset-token en production (`APP_EXPOSE_RESET_TOKEN=false`).

## Test Commands

### Backend (PHPUnit)
```bash
cd api
php bin/phpunit
```

### Frontend unit (Vitest)
```bash
cd frontend
npm run test:unit
```

Les tests unitaires frontend sont dans `frontend/tests/unit`.

Les tests component frontend sont dans `frontend/tests/component`.

### Frontend E2E (Playwright)
```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

`test:e2e` lance la suite UI mockee (rapide).

```bash
cd frontend
npm run test:e2e:smoke
```

`test:e2e:smoke` lance une petite suite smoke contre le backend reel.

```bash
cd frontend
npm run test:e2e:all
```

`test:e2e:all` lance les suites mockee + smoke backend reel.

Les tests E2E frontend sont dans `frontend/tests/e2e` et utilisent des selecteurs `data-testid` stables pour eviter de casser l'intention des tests lors des ajustements UI.
Les page objects E2E se trouvent dans `frontend/tests/e2e/page-objects`.

Les tests backend sont centralises dans `api/tests` avec des suites dediees:
- `api/tests/Unit`
- `api/tests/Integration` (E2E API scenarios through HTTP)

## CI
Workflow GitHub Actions: `.github/workflows/ci.yml`
- Le job backend lance PHPUnit.
- Le job frontend lance Vitest puis le build.
- Le job E2E installe Playwright, demarre les services via `node infra/scripts/dev.mjs up`, puis execute les tests Playwright.
- Les scripts de commande CI sont centralises dans `infra/ci/`.

## Docker
```bash
npm run docker:up
npm run docker:down
```

Les fichiers d'integration Docker sont centralises dans `infra/docker/`.

Services:
- `api` sur `http://localhost:8000`
- `frontend` sur `http://localhost:5173`

Notes perf Docker en local:
- Le conteneur API n'execute plus migrations/fixtures a chaque demarrage.
- Au premier lancement uniquement, `api/bin/dev-server.sh` initialise les dependances et les donnees SQLite si elles sont absentes.
- Si vous avez besoin d'une DB neuve, supprimez `database/sqlite/data.db` puis redemarrez le conteneur API.
