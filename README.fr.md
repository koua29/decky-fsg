<p align="center"><img src="docs/fsg-banner.jpeg" alt="FSG — Free Steam Game, plugin Steam Deck" width="100%"></p>

<p align="center"><a href="README.md">English</a> · <b>Français</b></p>

# FSG — Free Steam Game

Plugin **[Decky Loader](https://decky.xyz/)** pour **SteamOS** (Steam Deck, Lenovo Legion Go S / Go 2…). Il liste les jeux Steam **gratuits à garder** (remise temporaire de 100 %) dans le menu d'accès rapide, et les ajoute à ta bibliothèque en un clic, ou tout seul.

## 📸 Aperçu

<p align="center"><img src="docs/screenshot-device.jpg" alt="Le panneau FSG dans le menu d'accès rapide, sur une Lenovo Legion Go 2 sous SteamOS" width="80%"></p>

<p align="center"><img src="docs/screenshot-options.jpg" alt="Les options de FSG : ajout automatique, DLC gratuits, notifications, vérification des mises à jour" width="40%"></p>

<p align="center"><em>FSG en fonctionnement sur une Lenovo Legion Go 2 (SteamOS).</em></p>

### ✅ Testé en conditions réelles

Le 14 septembre 2026, **Crystal Crisis** (16,79 €) est passé à 100 % : FSG l'a **ajouté tout seul** à la bibliothèque dès l'allumage de la Legion Go 2, sans aucune action.

<p align="center">
  <img src="docs/proof-claimed.jpg" alt="Crystal Crisis dans la liste Gratuits à garder de FSG, marqué Déjà dans ta bibliothèque" width="40%">
  &nbsp;
  <img src="docs/proof-stats.jpg" alt="La vue Statistiques de FSG : Crystal Crisis dans Récemment ajoutés, 16,79 €, lundi 14 septembre à 18 h 24" width="42%">
</p>

<p align="center"><em>À gauche, le jeu marqué « Déjà dans ta bibliothèque » ; à droite, la vue Statistiques (bêta 0.4.0) qui l'affiche dans « Récemment ajoutés ».</em></p>

## ✨ Fonctions

- Liste des promos gratuites en cours, lues directement sur le store Steam : prix normal, date de fin quand Steam l'affiche.
- **Ajouter à ma bibliothèque** : ajoute la licence gratuite à ton compte sans ouvrir le Store.
- **Ajout automatique** (option, activée par défaut) : vérification toutes les heures ; chaque nouveau jeu à 0 € est ajouté et une notification s'affiche.
- DLC gratuits en option, notifications désactivables.
- **Ouvrir SteamDB** : affiche les promos à venir dans le navigateur de Steam.
- **Interface en français ou en anglais**, choisie automatiquement d'après la langue de Steam (les noms et les prix des jeux suivent aussi).

## 📥 Installation

Prérequis : une console sous SteamOS avec [Decky Loader](https://decky.xyz/) installé.

### Depuis la console, par URL (le plus simple)

1. Decky → ⚙️ Paramètres → Général → activer le **Mode développeur**.
2. Decky → ⚙️ → **Développeur** → **Installer un plugin depuis une URL**, puis coller :
   ```
   https://github.com/koua29/decky-fsg/releases/latest/download/FSG.zip
   ```
3. Valider : **FSG** apparaît dans la liste des plugins Decky.

### Avec le fichier ZIP

Télécharger `FSG.zip` depuis la page [Releases](https://github.com/koua29/decky-fsg/releases), puis Decky → ⚙️ → Développeur → **Installer un plugin depuis un fichier ZIP**.

## ⚙️ Fonctionnement

- **Promos** : recherche du store Steam `maxprice=free&specials=1` (jeux payants affichés à 0 €), puis `appdetails` et la page du jeu pour trouver le paquet gratuit (`subid`).
- **Ajout** : même requête que le bouton « Ajouter au compte » du store (`/freelicense/addfreelicense/<subid>`), puis vérification dans la liste des licences du compte.
- **Session** : le plugin lit localement les cookies du store dans le navigateur intégré de Steam, via le port de débogage CEF que Decky utilise déjà (`127.0.0.1:8080`). Ils ne sont envoyés qu'à `store.steampowered.com`.

SteamDB n'est pas interrogé automatiquement : le site bloque les requêtes hors navigateur (Cloudflare, HTTP 403).

**Statut** : projet jeune (0.x). En cas de souci, les journaux sont dans `~/homebrew/logs/FSG/` : ouvre une [issue](https://github.com/koua29/decky-fsg/issues) avec leur contenu.

## 🔄 Mises à jour

FSG vérifie une fois par jour s'il existe une nouvelle version sur GitHub. Si c'est le cas, une notification s'affiche et le panneau propose **Mettre à jour** : Decky ouvre sa fenêtre de confirmation habituelle, vérifie l'empreinte SHA-256 du zip, puis recharge le plugin. Les réglages et l'historique sont rangés hors du dossier du plugin, dans `~/homebrew/settings/FSG/` et `~/homebrew/data/FSG/`, et ne sont pas touchés.

Tu peux aussi vérifier à la main (Options → **Vérifier les mises à jour**), ou réinstaller par l'URL ci-dessus, qui pointe toujours vers la dernière version.

Depuis la 0.1.0, qui n'a pas cette vérification, il faut réinstaller une fois par l'URL.

Chaque version est publiée dans les [Releases](https://github.com/koua29/decky-fsg/releases) avec un tag `vX.Y.Z` et la liste des nouveautés.

### Versions bêta

Options → **Versions bêta** fait aussi regarder les versions de test (tags `vX.Y.Z-beta.N`, publiées en *pre-release* sur GitHub). Elles arrivent plus tôt et peuvent être instables ; sans cette option, FSG ne propose que les versions stables.

En repassant l'option sur off alors qu'une bêta est installée, le panneau propose de **revenir à la dernière version stable**.

## 🛠️ Développement

```bash
npm install
npm run build
```

Paquet : un dossier `FSG/` contenant `dist/`, `main.py`, `plugin.json`, `package.json`, `LICENSE` et `README.md`.

## 🎮 Consoles SteamOS

*Liens partenaires Amazon : si vous achetez via ces liens, le projet touche une petite commission, sans surcoût pour vous. Ce sont des consoles portables sous SteamOS, sur lesquelles FSG s'installe avec Decky Loader.*

<table>
<tr>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0CQ3RWQQZ?&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=d8fe32650df59e4b587c0f3faa6e2762&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0CQ3RWQQZ.jpg" width="200" alt="Steam Deck OLED"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0CQ3RWQQZ?&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=d8fe32650df59e4b587c0f3faa6e2762&amp;ref_=as_li_ss_tl">Steam Deck OLED</a></b><br><sub>La console SteamOS de Valve</sub>
</td>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0DWFY5G1N?th=1&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=27547fe4ab70827a6cc109b4a539d5a4&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0DWFY5G1N.jpg" width="200" alt="Lenovo Legion Go S"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0DWFY5G1N?th=1&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=27547fe4ab70827a6cc109b4a539d5a4&amp;ref_=as_li_ss_tl">Lenovo Legion Go S</a></b><br><sub>Livrée sous SteamOS</sub>
</td>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0FYR394K5?&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=094466eff2c7717ecebc49e8bf0f3a85&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0FYR394K5.jpg" width="200" alt="Lenovo Legion Go 2"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0FYR394K5?&amp;linkCode=ll2&amp;tag=koua29-21&amp;linkId=094466eff2c7717ecebc49e8bf0f3a85&amp;ref_=as_li_ss_tl">Lenovo Legion Go 2</a></b><br><sub>Écran OLED 8,8&quot; · compatible SteamOS</sub>
</td>
</tr>
</table>

<sub>En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises. · As an Amazon Associate I earn from qualifying purchases.</sub>

## ☕ Offrez-moi un café

Ce projet est gratuit et open source. S'il vous est utile, vous pouvez me remercier
en m'offrant un café — il suffit de scanner ce QR code PayPal. Merci beaucoup ! 🙏

<p align="center">
  <img src="docs/paypal-qr.png" alt="QR code PayPal pour offrir un café" width="220" />
</p>

## 📄 Licence

**MIT** — voir [LICENSE](LICENSE). Projet non officiel, non affilié à Valve ni à Lenovo. Steam et SteamOS sont des marques de Valve Corporation.
