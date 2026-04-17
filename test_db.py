import sys
sys.path.append(".")

from api.database import create_tables, check_connection, engine
from api.models import Medecin, Patient, Score

print("Test de la base de donnees PrediCare...")

# Crée les tables
create_tables()
print("Tables creees avec succes !")

# Vérifie la connexion
if check_connection():
    print("Connexion OK !")
else:
    print("Erreur de connexion !")

# Affiche les tables créées
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"\nTables dans la base : {tables}")