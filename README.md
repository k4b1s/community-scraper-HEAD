# Community Member Scraper

Ce projet est un scraper de membres de communauté (X/Twitter) qui récupère les comptes membres depuis une URL donnée (par exemple une liste ou un espace communautaire X/Twitter).  
Il utilise Puppeteer pour automatiser un navigateur Chrome visible (non headless), afin que l'utilisateur puisse suivre la session et interagir si besoin.

Les identifiants (login) et pseudos sont extraits, nettoyés (suppression des emojis dans les pseudos), puis sauvegardés dans un fichier CSV.

---

## Prérequis

- **Node.js** (https://nodejs.org/) installé sur votre machine (Windows, Mac ou Linux)
- **Google Chrome** installé (le scraper ouvre une fenêtre Chrome visible)
- Un compte X/Twitter valide pour se connecter

---

## Installation (tous systèmes)

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/k4b1s/community-scraper-HEAD.git
   ```

2. **Aller dans le dossier du projet :**
   ```bash
   cd community-scraper-HEAD
   ```

3. **Installer les dépendances :**
   ```bash
   npm install
   ```

---

## Utilisation

> **Note importante :**  
> Le scraper ouvre une fenêtre **Chrome visible** sur votre ordinateur.  
> **Vous devrez entrer vos identifiants X/Twitter directement dans la console/terminal** (ils ne s'affichent pas et ne sont jamais transmis ailleurs).

1. **Lancer le scraper avec l’URL cible :**
   ```bash
   node src/scraper.js <url-à-scraper>
   ```
   Par exemple :
   ```bash
   node src/scraper.js https://x.com/nom_communauté/liste
   ```

2. **Suivre les instructions dans le terminal :**
   - Entrez votre identifiant/email X/Twitter dans la console.
   - Entrez votre mot de passe (celui-ci ne s’affichera pas).
   - Si nécessaire, entrez le nom d’utilisateur (si X le demande après l'email).
   - La fenêtre Chrome va se connecter automatiquement et scroller pour extraire tous les membres.

3. **Résultat :**
   - À la fin, un fichier `members.csv` sera généré dans le dossier du projet, contenant la liste des membres (login, username).

---

## Tutoriel rapide par système

### Windows

- Installez Node.js depuis [nodejs.org](https://nodejs.org/)
- Installez Google Chrome depuis [google.com/chrome](https://www.google.com/chrome/)
- Ouvrez l’invite de commandes (cmd) ou PowerShell
- Suivez les étapes d’installation et d’utilisation ci-dessus

**Attention :**  
Si Chrome n’est pas installé dans le chemin par défaut (`C:\Program Files\Google\Chrome\Application\chrome.exe`), modifiez la ligne `executablePath` dans `src/scraper.js` pour pointer vers le bon emplacement de Chrome.

### Mac

- Installez Node.js et Google Chrome
- Ouvrez le Terminal
- Suivez les étapes d’installation et d’utilisation ci-dessus

**Attention :**  
Sur Mac, remplacez dans `src/scraper.js` la ligne :
```js
executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
```
(si Chrome est installé à cet emplacement).

### Linux

- Installez Node.js et Google Chrome (ou Chromium)
- Ouvrez le Terminal
- Suivez les étapes d’installation et d’utilisation ci-dessus

**Attention :**  
Sous Linux, adaptez également le chemin Chrome dans `src/scraper.js` si besoin (ex : `/usr/bin/google-chrome` ou `/usr/bin/chromium-browser`).

---

## Conseils

- Le scraping prend du temps (le script scroll lentement pour charger tous les membres).
- Le script s’arrête automatiquement s’il ne trouve plus de nouveaux membres.
- Si vous avez un grand nombre de membres, des sauvegardes intermédiaires sont créées (`members_temp_XXX.csv`).
- Respectez les conditions d’utilisation de X/Twitter.

---

## Support

Pour toute question, ouvrez une issue sur le dépôt GitHub.

---
