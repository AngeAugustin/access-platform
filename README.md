# Access — plateforme de tutorat scolaire

Application web progressive (PWA) qui remplace les cinq dépôts d'origine (API Symfony, applications Expo Parent et Éducateur, back-office React) par une seule application **Next.js 16** full-stack.

- **Espace Parent** (`/parent`) : enfants et niveaux par matière, catalogue d'éducateurs vérifiés filtrable, demande de tutorat avec devis immédiat, suivi et confirmation des séances, paiement Mobile Money par FedaPay, avis, réclamations.
- **Espace Éducateur** (`/educateur`) : dossier et pièces justificatives, disponibilités, élèves, saisie des séances (y compris hors connexion), reversements.
- **Espace Admin** (`/admin`) : tableau de bord, validation des dossiers, parents, élèves, tutorats, arbitrage des séances contestées, encaissements et reversements, réclamations, grille tarifaire, administrateurs, journal d'audit.

## Démarrage

Prérequis : Node.js 22+ et PostgreSQL 14+.

```bash
cp .env.example .env        # puis renseigner DATABASE_URL et les autres variables
npm install                 # génère aussi le client Prisma
npm run db:migrate          # crée les tables
npm run db:seed             # super-administrateur, paramètres, grille tarifaire d'exemple
npm run dev                 # http://localhost:3000
```

`SEED_DEMO=1 npm run db:seed` ajoute un parent, un éducateur validé et un enfant de démonstration (mot de passe `Demo12345678`). Interdit en production.

La grille tarifaire créée par le seed est un **exemple** : remplacez-la par les vrais tarifs depuis `/admin/tarifs`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run typecheck` | Génère les types de routes puis vérifie TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (Vitest) : facturation, signature webhook, anti-robot, adresse IP, validation, fichiers |
| `npm run audit:deps` | Audit des dépendances de production |
| `npm run security:check` | Contrôles de sécurité contre une instance démarrée (`BASE_URL=…`) |
| `npm run db:migrate` | Applique les migrations Prisma |
| `npm run db:seed` | Initialise la base |
| `npm run migrate:legacy` | Reprend les données de l'ancienne base MySQL (voir plus bas) |

## Architecture

```
prisma/schema.prisma      Modèle de données (relations et contraintes réelles)
src/proxy.ts              CSP à nonce + redirection des visiteurs non connectés
src/lib/                  Auth (argon2, sessions), validation Zod, facturation, référentiels
src/server/actions/       Actions serveur par espace (chaque action vérifie rôle et propriété)
src/server/services/      Tutorats, paiements FedaPay, notifications, stockage, tâches planifiées
src/app/(public)/         Accueil, connexion, inscription, mot de passe, mentions
src/app/parent|educateur|admin/   Les trois espaces
src/app/api/              Fichiers protégés, webhook FedaPay, tâche quotidienne
public/sw.js              Service worker (cache, hors connexion, notifications push)
```

### Règles de facturation

- Montant d'une période = heures par séance × séances par semaine × semaines × tarif horaire de la classe.
- Une échéance par période de 4 semaines (paramétrable), **sans plafond** ; chaque échéance est due à la fin de la période qu'elle couvre.
- Le tarif est figé dans le contrat à la création du tutorat.
- Arrêt anticipé : période en cours facturée au prorata des semaines entamées (payable sous 7 jours), échéances suivantes annulées ; une période déjà payée mais non consommée est signalée aux administrateurs pour remboursement.
- À chaque échéance payée, un reversement est créé pour l'éducateur, déduction faite de la commission Access (15 % par défaut).

### Paiements FedaPay

1. Le parent clique sur « Payer » : une transaction FedaPay est créée côté serveur et le navigateur est redirigé vers la page de paiement.
2. FedaPay notifie `POST /api/webhooks/fedapay` (signature HMAC vérifiée, événement traité une seule fois) et renvoie le parent sur `/parent/paiements/retour`.
3. Dans les deux cas, l'état de la transaction est **relu auprès de l'API FedaPay** et le montant est comparé à l'échéance avant toute écriture. La tâche quotidienne rattrape les webhooks perdus.
4. L'administrateur reverse l'éducateur via FedaPay (Mobile Money) ou enregistre un virement manuel.

Dans le tableau de bord FedaPay, déclarez le webhook `https://<votre-domaine>/api/webhooks/fedapay` et copiez son secret dans `FEDAPAY_WEBHOOK_SECRET`.

> Le client FedaPay suit la documentation et le SDK officiels, mais il a été testé contre un serveur FedaPay simulé : faites un paiement et un reversement réels en **sandbox** avant de passer `FEDAPAY_ENV=live`.

### Tâche quotidienne

Planifiez un appel quotidien (cron de l'hébergeur, crontab…) :

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<votre-domaine>/api/cron/daily
```

Elle clôture les tutorats arrivés à terme et libère leurs créneaux, relance les échéances (3 jours avant, puis en retard), rapproche les paiements en attente et purge les sessions et codes expirés.

### PWA et notifications

- Installable sur Android (invite automatique) et iPhone (Partager → « Sur l'écran d'accueil »).
- Notifications push : générez les clés avec `npx web-push generate-vapid-keys` et renseignez `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Sur iPhone, elles ne fonctionnent qu'une fois l'application installée (iOS 16.4+). Les événements importants sont aussi envoyés par e-mail.
- Hors connexion : les pages déjà vues restent consultables ; une séance saisie sans réseau est conservée sur le téléphone et envoyée automatiquement au retour de la connexion.

## Déploiement

- Un serveur Node.js (`npm run build && npm start`) derrière HTTPS, ou toute plateforme compatible Next.js.
- `STORAGE_DIR` doit pointer vers un **volume persistant** hors du dossier de l'application (les pièces justificatives y sont stockées). Sur une plateforme sans disque persistant, remplacez `src/server/services/storage.ts` par un stockage objet (S3, R2…).
- Lancez `npm run db:migrate` à chaque déploiement.
- Sauvegardez PostgreSQL et `STORAGE_DIR` chaque jour.

## Reprise des données de l'ancienne plateforme

```bash
npm run db:migrate
LEGACY_MYSQL_URL="mysql://lecture:***@hote:3306/ancienne_base" npm run migrate:legacy -- --dry-run
LEGACY_MYSQL_URL="mysql://lecture:***@hote:3306/ancienne_base" npm run migrate:legacy -- --force-reset
```

- `--dry-run` affiche ce qui serait importé et la liste des points d'attention, sans rien écrire.
- `--force-reset` n'importe pas les anciens mots de passe : ils étaient stockés **en clair**, il faut les considérer comme exposés. Les utilisateurs passent alors par « Mot de passe oublié ». Sans cette option, les anciens mots de passe sont repris (hachés).
- La migration est faite en une seule transaction et refuse de tourner sur une base qui contient déjà des comptes.
- Conversions : niveaux scolaires en texte libre → Faible / Moyen / Bon / Très bon ; disponibilités et créneaux « Lundi 08h-11h » → créneaux structurés ; statuts de paiement « En attente / Provisoire / Effectué / Suspendu » → échéances et reversements ; pièces justificatives en blob → fichiers dont le type réel est vérifié. Les reversements repris sont sans commission (l'ancien système n'en prélevait pas).
- Après la migration : les éducateurs validés doivent compléter matières, classes et numéro Mobile Money ; les comptes administrateurs repris ne sont pas super-administrateurs.

Voir [SECURITY.md](SECURITY.md) pour la mise en conformité de sécurité.
