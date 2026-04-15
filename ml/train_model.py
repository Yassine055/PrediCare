import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
from xgboost import XGBClassifier
import shap
import joblib
import matplotlib.pyplot as plt
import os

# Répertoire racine du projet (parent du dossier ml/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 1. Charger les données ────────────────────────────────────────────────────
print("Chargement des donnees...")
df = pd.read_csv(os.path.join(BASE_DIR, "data", "patients.csv"))
print(f"Dataset : {df.shape[0]} patients, {df.shape[1]} colonnes")
print(f"Diabetiques : {df['diabete'].sum()} ({df['diabete'].mean()*100:.1f}%)")

# ── 2. Préparer les features ──────────────────────────────────────────────────
FEATURES = [
    "age", "imc", "glycemie_jeun", "hba1c",
    "tension_systolique", "tension_diastolique",
    "hdl", "ldl", "creatinine", "tabac", "antecedents_familiaux"
]

X = df[FEATURES]
y = df["diabete"]

# ── 3. Normalisation ──────────────────────────────────────────────────────────
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
X_scaled = pd.DataFrame(X_scaled, columns=FEATURES)

# ── 4. Split train / test ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nTrain : {len(X_train)} | Test : {len(X_test)}")

# ── 5. Entraîner XGBoost ──────────────────────────────────────────────────────
print("\nEntrainement XGBoost...")
model = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="auc",
    random_state=42,
    verbosity=0
)
model.fit(X_train, y_train)
print("Entrainement termine !")

# ── 6. Validation croisée ─────────────────────────────────────────────────────
print("\nValidation croisee 5-fold...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(model, X_scaled, y, cv=cv, scoring="roc_auc")
print(f"AUC-ROC par fold : {[round(s, 3) for s in cv_scores]}")
print(f"AUC-ROC moyen    : {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ── 7. Évaluation finale ──────────────────────────────────────────────────────
y_pred       = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]
auc          = roc_auc_score(y_test, y_pred_proba)

print(f"\n=== RESULTATS FINAUX ===")
print(f"AUC-ROC : {auc:.4f}")
print(f"\nRapport de classification :")
print(classification_report(y_test, y_pred,
      target_names=["Non diabetique", "Diabetique"]))

# ── 8. Analyse SHAP ───────────────────────────────────────────────────────────
print("\nCalcul SHAP...")
explainer   = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Graphique SHAP — importance globale
plt.figure(figsize=(10, 6))
shap.summary_plot(shap_values, X_test, plot_type="bar", show=False)
plt.title("PrediCare — Importance des features (SHAP)")
plt.tight_layout()
os.makedirs(os.path.join(BASE_DIR, "ml"), exist_ok=True)
plt.savefig(os.path.join(BASE_DIR, "ml", "shap_importance.png"), dpi=150, bbox_inches="tight")
plt.close()
print("Graphique SHAP sauvegarde : ml/shap_importance.png")

# ── 9. Sauvegarder modèle + scaler ───────────────────────────────────────────
joblib.dump(model,  os.path.join(BASE_DIR, "ml", "model.pkl"))
joblib.dump(scaler, os.path.join(BASE_DIR, "ml", "scaler.pkl"))
print("\nModele sauvegarde  : ml/model.pkl")
print("Scaler sauvegarde  : ml/scaler.pkl")

# ── 10. Résumé final ──────────────────────────────────────────────────────────
print("\n" + "="*40)
print("RESUME FINAL")
print("="*40)
print(f"AUC-ROC test     : {auc:.4f}")
print(f"AUC-ROC CV moyen : {cv_scores.mean():.4f}")
if auc >= 0.85:
    print("OBJECTIF ATTEINT : AUC > 0.85 ✓")
else:
    print(f"Objectif non atteint — AUC actuel : {auc:.4f}")
print("="*40)