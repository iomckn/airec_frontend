# AiRec Frontend

AiRec Frontend est l'interface web du projet AiRec.  
Son objectif est de permettre a un utilisateur de decouvrir des films de maniere plus personnalisee grace a une API de recommandations, avec une experience simple autour de la recherche, des categories, des notes et du profil utilisateur.

## Ce que fait le projet

- afficher une page d'accueil avec des recommandations
- permettre l'inscription et la connexion
- rechercher un film ou une serie
- filtrer des films par categories
- consulter une fiche film et attribuer une note
- afficher et modifier le profil utilisateur

## Stack technique

- Python
- Flask
- HTML / CSS / JavaScript
- API externe : `https://airec-api.randever.com`

## Demarrage local

1. Cloner le projet puis se placer dans le dossier :

```bash
git clone <url-du-repo>
cd airec_frontend
```

2. Creer un environnement virtuel :

```bash
python3 -m venv .venv
```

3. Activer l'environnement :

```bash
source .venv/bin/activate
```

4. Installer les dependances :

```bash
pip install -r requirements.txt
```

5. Lancer l'application :

```bash
python app.py
```

6. Ouvrir dans le navigateur :

```text
http://127.0.0.1:5000
```

## Points importants

- L'application depend de l'API `airec-api.randever.com` pour la connexion, les categories, la recherche et les recommandations.
- Si l'API est indisponible, certaines pages peuvent s'afficher sans donnees ou avec un message d'erreur.
- Le lancement actuel se fait en mode debug via Flask pour le developpement local.

## Pages principales

- `/` : accueil
- `/login` : connexion
- `/register` : inscription
- `/categories` : selection de categories et affichage des films
- `/recherche_film?q=...` : recherche
- `/film/<id>` : detail d'un film
- `/profil` : profil utilisateur
