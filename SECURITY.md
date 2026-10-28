# Sécurité

Ce document récapitule les failles relevées dans l'ancienne plateforme et la façon dont la nouvelle version les traite.

## Corrections par rapport à l'ancienne plateforme

| Id | Ancienne plateforme | Nouvelle version |
| --- | --- | --- |
| S1 | Mots de passe stockés et comparés en clair | Argon2id (paramètres OWASP), comparaison à temps constant, empreinte factice quand le compte n'existe pas |
| S2 | Toutes les routes `/api` publiques, aucun jeton | Sessions serveur : cookie `httpOnly`, `Secure`, `SameSite=Lax` contenant un jeton aléatoire de 256 bits ; seule son empreinte SHA-256 est en base ; nouvelle session à chaque connexion ; expiration glissante de 7 jours |
| S3 | Données d'un autre utilisateur lisibles en changeant le NPI dans l'URL | Chaque page et action serveur vérifie le rôle **et** la propriété (un parent ne voit que ses enfants et tutorats, un éducateur que ses élèves) ; les espaces Parent et Éducateur ne prennent jamais d'identifiant d'utilisateur en paramètre |
| S4 | Création publique de comptes `ADMIN` | L'inscription n'accepte que Parent ou Éducateur ; les administrateurs sont créés par un super-administrateur |
| S5 | Clé FedaPay et secret de webhook écrits dans le code, `.env` versionné | Secrets uniquement en variables d'environnement, `.env*` ignoré par Git (sauf `.env.example`) |
| S6 | Code de réinitialisation sans expiration ni limite | Code à 6 chiffres haché et comparé à temps constant, valable 15 minutes, 5 essais, un seul code actif, toutes les sessions fermées après changement ; réponse identique que le compte existe ou non |
| S7 | Webhook de paiement sans contrôle du montant ni du rejeu | Signature HMAC-SHA256 vérifiée à temps constant avec tolérance de 5 minutes, événements dédoublonnés, état relu auprès de FedaPay, montant comparé à l'échéance, transitions de statut atomiques |
| S8 | Fichiers sans contrôle de type ni de taille, stockés en base | 5 Mo maximum, type détecté sur le contenu (PDF, JPEG, PNG), noms aléatoires, stockage hors du dossier public, téléchargement après contrôle d'accès avec `nosniff` et CSP `sandbox` |
| S9 | CORS et validations minimaux | Validation Zod de toutes les entrées ; actions serveur protégées contre le CSRF par contrôle de l'en-tête `Origin` ; pas d'API JSON ouverte aux autres origines |

## Autres protections

- **En-têtes** : Content-Security-Policy stricte avec nonce par requête, sans `unsafe-inline` ni pour les scripts ni pour les styles (`script-src 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'nonce-…'`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, en-tête `X-Powered-By` supprimé. Toutes les pages sont rendues à la demande pour porter le nonce.
- **Formulaires** : envoyés en POST même si JavaScript ne se charge pas (aucune donnée saisie dans l'URL) ; arguments des actions serveur validés.
- **Force brute sans blocage abusif** : après 3 échecs sur un compte, toute nouvelle tentative exige une vérification anti-robot (preuve de travail calculée par le navigateur, sans service tiers, environ 2 à 5 secondes). Après 5 échecs depuis une même adresse IP sur un même compte, cette adresse seule est bloquée 15 minutes : un tiers ne peut pas bloquer le compte de quelqu'un d'autre. Limites par adresse IP sur la connexion, l'inscription et la réinitialisation ; limites par compte sur les paiements, envois de fichiers et réclamations. Compteurs en base (fonctionne avec plusieurs instances).
- **Robots** : l'inscription et la demande de code de réinitialisation exigent toujours la vérification anti-robot. Chaque solution est signée (HMAC), liée à son usage, expire après 10 minutes et ne sert qu'une fois.
- **Adresse IP fiable** : seules les adresses ajoutées par les proxys déclarés de confiance (`TRUSTED_PROXY_COUNT`, `CLIENT_IP_HEADER`) sont prises en compte ; une adresse forgée dans `X-Forwarded-For` est ignorée. Sans proxy de confiance, aucune limite n'est appliquée par adresse (les limites par compte restent actives).
- **Redirections** : le paramètre `suite` de la connexion n'accepte que des chemins internes.
- **Journal d'audit** : connexions (réussies et échouées), validations et rejets, suspensions, arrêts de tutorat, paiements, reversements, modifications de tarifs et de paramètres, avec l'adresse IP.
- **Comptes suspendus** : déconnectés immédiatement (sessions supprimées).
- **Appareils partagés** : le cache des pages est vidé à la déconnexion ; l'API et les fichiers ne sont jamais mis en cache par le service worker.
- **Tâche planifiée** protégée par un jeton comparé à temps constant.

## Contrôles automatisés

| Contrôle | Où |
| --- | --- |
| Tests unitaires : signature webhook, preuve de travail, adresse IP derrière proxy, règles de saisie, détection de type de fichier | `npm test` |
| Audit des dépendances de production (échec si vulnérabilité haute ou critique) | `npm run audit:deps`, CI à chaque envoi et chaque lundi |
| Contrôles contre l'application démarrée : en-têtes et CSP, nonce unique, redirection des espaces privés, session forgée, fichiers, tâche planifiée, webhook, erreurs sans trace technique | `BASE_URL=… npm run security:check`, CI |
| Mises à jour de sécurité des dépendances | Dependabot (`.github/dependabot.yml`) |

Le premier audit a détecté et fait corriger une vulnérabilité haute de `zod` (épuisement mémoire, GHSA-mrhx-c7xc-m3w5) et trois failles de l'outil de test `vitest` (mis à jour en version 5).

## Reste à faire

- Double authentification pour les comptes administrateurs.
- Chiffrement au repos des pièces justificatives et analyse antivirus des dépôts.
- Export et suppression des données personnelles par l'utilisateur ; durée de conservation du journal d'audit.
- Test d'intrusion par un prestataire indépendant avant l'ouverture au grand public.

## À faire avant la mise en production

1. **Renouveler toutes les clés exposées dans les anciens dépôts** : clé secrète FedaPay sandbox et secret de webhook (`PayerParentController.php`), identifiants de base de données et clé Resend (`.env` versionné). Les retirer de l'historique Git des anciens dépôts ou archiver ces dépôts en privé.
2. Choisir l'option `--force-reset` lors de la migration des comptes (mots de passe historiquement en clair).
3. Faire valider les conditions d'utilisation et la politique de confidentialité, et déclarer le traitement auprès de l'APDP (données de mineurs, casiers judiciaires).
4. Configurer un domaine d'envoi vérifié pour les e-mails (`MAIL_FROM`).
5. Définir `POW_SECRET` (32 caractères aléatoires) et `TRUSTED_PROXY_COUNT` selon l'hébergement (1 derrière un répartiteur de charge, `CLIENT_IP_HEADER=cf-connecting-ip` derrière Cloudflare).
6. Mettre en place les sauvegardes quotidiennes de PostgreSQL et de `STORAGE_DIR`.

## Signaler une vulnérabilité

Écrire à l'équipe Access (adresse à définir) sans divulguer publiquement le problème avant sa correction.
