import os
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")          # backend sans interface graphique
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import shap

# ── Chemins ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR   = os.path.join(BASE_DIR, "ml")
DATA_DIR = os.path.join(BASE_DIR, "data")

FEATURES = [
    "age", "imc", "glycemie_jeun", "hba1c",
    "tension_systolique", "tension_diastolique",
    "hdl", "ldl", "creatinine", "tabac", "antecedents_familiaux"
]

# ─────────────────────────────────────────────────────────────────────────────
# 1. Chargement modèle, scaler et données
# ─────────────────────────────────────────────────────────────────────────────
print("=" * 58)
print("  PrediCare — Analyse SHAP")
print("=" * 58)
print("\n[1/4] Chargement du modele, du scaler et des donnees...")

model  = joblib.load(os.path.join(ML_DIR, "model.pkl"))
scaler = joblib.load(os.path.join(ML_DIR, "scaler.pkl"))
df     = pd.read_csv(os.path.join(DATA_DIR, "patients.csv"))

X_raw    = df[FEATURES].reset_index(drop=True)
y        = df["diabete"].reset_index(drop=True)
X_scaled = pd.DataFrame(scaler.transform(X_raw), columns=FEATURES)

print(f"    Dataset  : {len(df)} patients")
print(f"    Positifs : {y.sum()} diabetiques ({y.mean() * 100:.1f} %)")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Calcul des valeurs SHAP (TreeExplainer)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[2/4] Calcul des valeurs SHAP (TreeExplainer)...")
explainer   = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_scaled)

# Certaines versions de shap retournent une liste [neg_class, pos_class]
if isinstance(shap_values, list):
    shap_values = shap_values[1]

print(f"    Valeurs SHAP calculees pour {len(X_scaled)} patients "
      f"x {len(FEATURES)} features")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Graphique 1 — Importance globale (barres)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3/4] Generation des graphiques...")

plt.figure(figsize=(10, 6))
shap.summary_plot(shap_values, X_raw, plot_type="bar", show=False)
plt.title("PrediCare — Importance globale des features (SHAP)",
          fontsize=14, fontweight="bold", pad=12)
plt.xlabel("Importance moyenne |SHAP|", fontsize=11)
plt.tight_layout()
out1 = os.path.join(ML_DIR, "shap_importance_globale.png")
plt.savefig(out1, dpi=150, bbox_inches="tight")
plt.close()
print("    [OK] shap_importance_globale.png")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Graphique 2 — Beeswarm (distribution complète des valeurs SHAP)
# ─────────────────────────────────────────────────────────────────────────────
plt.figure(figsize=(11, 7))
shap.summary_plot(shap_values, X_raw, plot_type="dot", show=False)
plt.title("PrediCare — Distribution des valeurs SHAP (beeswarm)",
          fontsize=14, fontweight="bold", pad=12)
plt.tight_layout()
out2 = os.path.join(ML_DIR, "shap_beeswarm.png")
plt.savefig(out2, dpi=150, bbox_inches="tight")
plt.close()
print("    [OK] shap_beeswarm.png")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Sélection du patient diabétique avec le score de risque le plus élevé
# ─────────────────────────────────────────────────────────────────────────────
proba_all      = model.predict_proba(X_scaled)[:, 1]
diabetic_mask  = y == 1
diabetic_idx   = np.where(diabetic_mask)[0]
patient_idx    = diabetic_idx[np.argmax(proba_all[diabetic_idx])]

patient_raw    = X_raw.iloc[patient_idx]
patient_shap   = shap_values[patient_idx]
patient_proba  = float(proba_all[patient_idx])
patient_score  = round(patient_proba * 100, 1)

if patient_score >= 70:
    niveau       = "ELEVE"
    niveau_color = "#C0392B"
elif patient_score >= 40:
    niveau       = "MODERE"
    niveau_color = "#E67E22"
else:
    niveau       = "FAIBLE"
    niveau_color = "#27AE60"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Graphique 3 — Analyse individuelle (barres horizontales colorées)
# ─────────────────────────────────────────────────────────────────────────────
sorted_idx = np.argsort(np.abs(patient_shap))[::-1]   # décroissant
feat_names = [FEATURES[i] for i in sorted_idx]
shap_vals  = [float(patient_shap[i]) for i in sorted_idx]
feat_vals  = [float(patient_raw[FEATURES[i]]) for i in sorted_idx]
bar_colors = ["#E74C3C" if v > 0 else "#27AE60" for v in shap_vals]

fig, ax = plt.subplots(figsize=(12, 7))
bars = ax.barh(feat_names, shap_vals,
               color=bar_colors, edgecolor="white", height=0.6)

# Annoter chaque barre avec la valeur SHAP et la valeur brute de la feature
for bar, val, fval in zip(bars, shap_vals, feat_vals):
    offset = 0.003 if val >= 0 else -0.003
    ha     = "left"  if val >= 0 else "right"
    ax.text(val + offset,
            bar.get_y() + bar.get_height() / 2,
            f"{val:+.4f}  (val = {fval:.2f})",
            va="center", ha=ha, fontsize=8.5, color="#2C3E50")

ax.axvline(0, color="#2C3E50", linewidth=1.3)
ax.set_xlabel("Contribution SHAP", fontsize=11)
ax.set_title(
    f"PrediCare — Analyse individuelle  |  Patient #{patient_idx}\n"
    f"Score de risque : {patient_score} / 100   —   Niveau : {niveau}",
    fontsize=13, fontweight="bold", color=niveau_color, pad=12
)

red_patch   = mpatches.Patch(color="#E74C3C", label="Augmente le risque  (RISQUE)")
green_patch = mpatches.Patch(color="#27AE60", label="Reduit le risque  (PROTECTION)")
ax.legend(handles=[red_patch, green_patch], loc="lower right", fontsize=9)
ax.invert_yaxis()
ax.grid(axis="x", alpha=0.25, linestyle="--")
fig.tight_layout()

out3 = os.path.join(ML_DIR, "shap_patient_individuel.png")
plt.savefig(out3, dpi=150, bbox_inches="tight")
plt.close()
print("    [OK] shap_patient_individuel.png")

# ─────────────────────────────────────────────────────────────────────────────
# 7. Rapport terminal — patient sélectionné
# ─────────────────────────────────────────────────────────────────────────────
print()
print("=" * 58)
print(f"  PATIENT SELECTIONNE  (index #{patient_idx})")
print("=" * 58)
print(f"  Age                   : {patient_raw['age']:.0f} ans")
print(f"  IMC                   : {patient_raw['imc']:.1f} kg/m²")
print(f"  Glycemie a jeun       : {patient_raw['glycemie_jeun']:.2f} g/L")
print(f"  HbA1c                 : {patient_raw['hba1c']:.1f} %")
print(f"  Antecedents familiaux : {'Oui' if patient_raw['antecedents_familiaux'] == 1 else 'Non'}")
print()
print(f"  Score de risque       : {patient_score} / 100")
print(f"  Niveau                : {niveau}")
print()
print("  Contributions SHAP par variable :")
print(f"  {'Variable':<26} {'Valeur':>8}  {'SHAP':>9}  Direction")
print("  " + "-" * 58)
for i in sorted_idx:
    fname     = FEATURES[i]
    fval      = float(patient_raw[fname])
    sval      = float(patient_shap[i])
    direction = "RISQUE     (+)" if sval > 0 else "PROTECTION (-)"
    print(f"  {fname:<26} {fval:>8.2f}  {sval:>+9.4f}  {direction}")

# ─────────────────────────────────────────────────────────────────────────────
# 8. Résumé final
# ─────────────────────────────────────────────────────────────────────────────
print()
print("=" * 58)
print("  RESUME — Fichiers generes dans ml/")
print("=" * 58)
print("  [1] shap_importance_globale.png")
print("      → Importance globale (barres) de toutes les features")
print("  [2] shap_beeswarm.png")
print("      → Distribution complete des valeurs SHAP")
print(f"  [3] shap_patient_individuel.png")
print(f"      → Analyse individuelle patient #{patient_idx}"
      f"  (score {patient_score} %  —  {niveau})")
print("=" * 58)
print("  Analyse SHAP terminee avec succes !")
print("=" * 58)
