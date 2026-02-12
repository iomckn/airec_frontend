# airec_frontend

## Installation

1. Creez et activez un environnement virtuel (recommande).
2. Installez les dependances :

```bash
pip install -r requirements.txt
```

## Lancer le projet

```bash
python app.py
```

L'application Flask tourne alors en mode debug sur http://127.0.0.1:5000/.

## Tutoriel macOS

```bash
cd airec_frontend
python3 -m venv venv             # creer le venv dans le dossier du projet
source venv/bin/activate         # activer le venv
pip install -r requirements.txt  # installer les deps
python3 app.py                   # lancer le serveur
```

## Tutoriel Windows

Sous PowerShell :

```powershell
cd airec_frontend
python -m venv venv              # creer le venv dans le dossier du projet
.\venv\Scripts\Activate.ps1     # activer le venv
python -m pip install -r requirements.txt
python app.py
```

Sous Invite de commandes (cmd) :

```cmd
cd airec_frontend
python -m venv venv
venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python app.py
```
