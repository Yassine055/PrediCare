"""
generate_pdf.py — Génération de rapports PDF patients pour PrediCare
Utilise ReportLab (SimpleDocTemplate + Platypus)
"""

from datetime import date
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Palette de couleurs PrediCare ─────────────────────────────────────────────
C_BLEU       = colors.HexColor("#0C447C")   # titre principal
C_VERT_TXT   = colors.HexColor("#27500A")   # texte statut NORMAL / niveau faible
C_VERT_BG    = colors.HexColor("#EAF3DE")   # fond encadré risque faible
C_ORANGE_TXT = colors.HexColor("#633806")   # texte statut LIMITE/BAS / niveau modéré
C_ORANGE_BG  = colors.HexColor("#FAEEDA")   # fond encadré risque modéré
C_ROUGE_TXT  = colors.HexColor("#791F1F")   # texte statut ÉLEVÉ / niveau élevé
C_ROUGE_BG   = colors.HexColor("#FCEBEB")   # fond encadré risque élevé
C_GRIS_ENTETE = colors.HexColor("#D9E4F0")  # fond entête de tableau
C_GRIS_LIGNE  = colors.HexColor("#F5F5F5")  # fond ligne paire de tableau
C_TEXTE       = colors.HexColor("#1A1A1A")  # texte principal
C_SOUS_TITRE  = colors.HexColor("#444444")  # texte secondaire


# ─────────────────────────────────────────────────────────────────────────────
# Styles Paragraph
# ─────────────────────────────────────────────────────────────────────────────

def _build_styles() -> dict[str, ParagraphStyle]:
    """Crée et retourne tous les styles de paragraphe utilisés dans le PDF."""
    base = getSampleStyleSheet()

    return {
        "titre_app": ParagraphStyle(
            "titre_app",
            fontName="Helvetica-Bold",
            fontSize=26,
            textColor=C_BLEU,
            alignment=TA_CENTER,
            spaceAfter=25,
        ),
        "sous_titre_app": ParagraphStyle(
            "sous_titre_app",
            fontName="Helvetica",
            fontSize=11,
            textColor=C_SOUS_TITRE,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "meta": ParagraphStyle(
            "meta",
            fontName="Helvetica",
            fontSize=9,
            textColor=C_SOUS_TITRE,
            alignment=TA_CENTER,
            spaceAfter=1,
        ),
        "section": ParagraphStyle(
            "section",
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=C_BLEU,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "normal": ParagraphStyle(
            "normal",
            fontName="Helvetica",
            fontSize=9,
            textColor=C_TEXTE,
            spaceAfter=2,
        ),
        "score_grand": ParagraphStyle(
            "score_grand",
            fontName="Helvetica-Bold",
            fontSize=20,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "score_message": ParagraphStyle(
            "score_message",
            fontName="Helvetica",
            fontSize=9,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "recommandation": ParagraphStyle(
            "recommandation",
            fontName="Helvetica",
            fontSize=9,
            textColor=C_TEXTE,
            leftIndent=10,
            spaceAfter=2,
        ),
        "vert": ParagraphStyle(
            "vert",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=C_VERT_TXT,
        ),
        "rouge": ParagraphStyle(
            "rouge",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=C_ROUGE_TXT,
        ),
        "orange": ParagraphStyle(
            "orange",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=C_ORANGE_TXT,
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Évaluation des statuts biologiques
# ─────────────────────────────────────────────────────────────────────────────

def _statut_glycemie(val: float) -> tuple[str, Any]:
    """Glycémie à jeun en mmol/L — seuils ADA 2023."""
    if val <= 5.6:
        return "NORMAL", C_VERT_TXT
    if val <= 6.9:
        return "LIMITE", C_ORANGE_TXT
    return "ELEVE", C_ROUGE_TXT


def _statut_hba1c(val: float) -> tuple[str, Any]:
    """HbA1c en % — seuils ADA 2023."""
    if val < 5.7:
        return "NORMAL", C_VERT_TXT
    if val < 6.5:
        return "LIMITE", C_ORANGE_TXT
    return "ELEVE", C_ROUGE_TXT


def _statut_tension_sys(val: float) -> tuple[str, Any]:
    """Tension systolique en mmHg."""
    if val < 130:
        return "NORMAL", C_VERT_TXT
    return "ELEVE", C_ROUGE_TXT


def _statut_tension_dia(val: float) -> tuple[str, Any]:
    """Tension diastolique en mmHg."""
    if val < 85:
        return "NORMAL", C_VERT_TXT
    return "ELEVE", C_ROUGE_TXT


def _statut_hdl(val: float) -> tuple[str, Any]:
    """HDL cholestérol en mmol/L — bas si < 1.0."""
    if val >= 1.0:
        return "NORMAL", C_VERT_TXT
    return "BAS", C_ORANGE_TXT


def _statut_ldl(val: float) -> tuple[str, Any]:
    """LDL cholestérol en mmol/L."""
    if val < 3.4:
        return "NORMAL", C_VERT_TXT
    return "ELEVE", C_ROUGE_TXT


def _statut_creatinine(val: float) -> tuple[str, Any]:
    """Créatinine sérique en µmol/L."""
    if 60 <= val <= 110:
        return "NORMAL", C_VERT_TXT
    return "ELEVE", C_ROUGE_TXT


# ─────────────────────────────────────────────────────────────────────────────
# Style générique pour les tableaux de données
# ─────────────────────────────────────────────────────────────────────────────

def _style_tableau_base(n_lignes: int, n_cols: int) -> TableStyle:
    """Retourne le style de base commun à tous les tableaux du rapport."""
    cmds = [
        # En-tête
        ("BACKGROUND",   (0, 0), (n_cols - 1, 0), C_GRIS_ENTETE),
        ("TEXTCOLOR",    (0, 0), (n_cols - 1, 0), C_BLEU),
        ("FONTNAME",     (0, 0), (n_cols - 1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (n_cols - 1, 0), 9),
        # Données
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 9),
        ("TEXTCOLOR",    (0, 1), (-1, -1), C_TEXTE),
        # Lignes paires
        *[
            ("BACKGROUND", (0, i), (n_cols - 1, i), C_GRIS_LIGNE)
            for i in range(2, n_lignes, 2)
        ],
        # Bordures
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCCC")),
        ("LINEBELOW",    (0, 0), (-1, 0),  0.8, C_BLEU),
        # Padding
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]
    return TableStyle(cmds)


# ─────────────────────────────────────────────────────────────────────────────
# Pied de page (footer sur chaque page)
# ─────────────────────────────────────────────────────────────────────────────

def _draw_footer(canvas, doc) -> None:
    """Dessine le pied de page sur chaque page du PDF."""
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#888888"))

    page_width = A4[0]
    marge      = 18 * mm

    # Ligne de séparation
    canvas.setStrokeColor(colors.HexColor("#CCCCCC"))
    canvas.setLineWidth(0.5)
    canvas.line(marge, 18 * mm, page_width - marge, 18 * mm)

    # Textes
    canvas.drawCentredString(
        page_width / 2, 14 * mm,
        "PrediCare — Outil d'aide à la décision médicale"
    )
    canvas.drawCentredString(
        page_width / 2, 10 * mm,
        "Ce rapport ne remplace pas l'avis d'un médecin qualifié"
    )
    # Numéro de page aligné à droite
    canvas.drawRightString(
        page_width - marge, 10 * mm,
        f"Page {doc.page}"
    )
    canvas.restoreState()


# ─────────────────────────────────────────────────────────────────────────────
# Fonction principale — génération du PDF
# ─────────────────────────────────────────────────────────────────────────────

def generate_patient_report(
    patient: dict,
    prediction: dict,
    medecin_nom: str,
) -> bytes:
    """
    Génère un rapport PDF professionnel pour un patient.

    Args:
        patient     : dict avec les données personnelles et biologiques du patient
        prediction  : dict avec score, niveau, probabilite, shap_values, message
        medecin_nom : nom complet du médecin (ex: "Benali Yasmine")

    Returns:
        Contenu du PDF sous forme de bytes (prêt à être envoyé via HTTP)
    """
    buffer = BytesIO()
    styles = _build_styles()

    # Marges 18 mm, format A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize    = A4,
        leftMargin  = 18 * mm,
        rightMargin = 18 * mm,
        topMargin   = 18 * mm,
        bottomMargin= 25 * mm,   # espace pour le footer
    )

    largeur_utile = A4[0] - 36 * mm   # largeur disponible entre marges
    elements: list = []

    # ── SECTION 1 — EN-TÊTE ──────────────────────────────────────────────────
    elements.append(Paragraph("PrediCare", styles["titre_app"]))
    elements.append(Paragraph(
        "Rapport de détection précoce — Diabète de type 2",
        styles["sous_titre_app"],
    ))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        f"Médecin : Dr. {medecin_nom}",
        styles["meta"],
    ))
    elements.append(Paragraph(
        f"Date : {date.today().strftime('%d/%m/%Y')}",
        styles["meta"],
    ))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=C_BLEU, spaceAfter=6
    ))

    # ── SECTION 2 — INFORMATIONS PATIENT ─────────────────────────────────────
    elements.append(Paragraph("Informations du patient", styles["section"]))

    tabac_txt = "Oui" if patient.get("tabac") == 1 else "Non"
    atcd_txt  = "Oui" if patient.get("antecedents_familiaux") == 1 else "Non"

    info_data = [
        ["Nom complet",
         f"{patient.get('prenom', '')} {patient.get('nom', '')}",
         "Âge",
         f"{patient.get('age', '—')} ans"],
        ["IMC",
         f"{patient.get('imc', '—'):.1f} kg/m²",
         "Tabagisme",
         tabac_txt],
        ["Antécédents familiaux",
         atcd_txt,
         "Date du rapport",
         date.today().strftime("%d/%m/%Y")],
    ]

    col_w = largeur_utile / 4
    tbl_info = Table(info_data, colWidths=[col_w * 1.3, col_w * 0.9, col_w * 1.1, col_w * 0.7])
    tbl_info.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),   # col étiquette
        ("FONTNAME",      (2, 0), (2, -1), "Helvetica-Bold"),   # col étiquette
        ("TEXTCOLOR",     (0, 0), (0, -1), C_BLEU),
        ("TEXTCOLOR",     (2, 0), (2, -1), C_BLEU),
        ("BACKGROUND",    (0, 0), (-1, -1), C_GRIS_LIGNE),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCCC")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(tbl_info)

    # ── SECTION 3 — BILAN BIOLOGIQUE ─────────────────────────────────────────
    elements.append(Paragraph("Bilan biologique", styles["section"]))

    # Définition des lignes : (label, valeur formatée, référence, fn_statut)
    bio_lignes = [
        ("Glycémie à jeun",
         f"{patient.get('glycemie_jeun', 0):.2f} mmol/L",
         "3.9 – 5.6 mmol/L",
         _statut_glycemie(patient.get("glycemie_jeun", 0))),
        ("HbA1c",
         f"{patient.get('hba1c', 0):.1f} %",
         "< 5.7 %",
         _statut_hba1c(patient.get("hba1c", 0))),
        ("Tension systolique",
         f"{patient.get('tension_systolique', 0):.0f} mmHg",
         "< 130 mmHg",
         _statut_tension_sys(patient.get("tension_systolique", 0))),
        ("Tension diastolique",
         f"{patient.get('tension_diastolique', 0):.0f} mmHg",
         "< 85 mmHg",
         _statut_tension_dia(patient.get("tension_diastolique", 0))),
        ("HDL cholestérol",
         f"{patient.get('hdl', 0):.2f} mmol/L",
         "> 1.0 mmol/L",
         _statut_hdl(patient.get("hdl", 0))),
        ("LDL cholestérol",
         f"{patient.get('ldl', 0):.2f} mmol/L",
         "< 3.4 mmol/L",
         _statut_ldl(patient.get("ldl", 0))),
        ("Créatinine",
         f"{patient.get('creatinine', 0):.0f} µmol/L",
         "60 – 110 µmol/L",
         _statut_creatinine(patient.get("creatinine", 0))),
    ]

    # Construction du tableau biologique avec paragraphes colorés pour le statut
    entete_bio = [["Paramètre", "Valeur", "Référence normale", "Statut"]]
    lignes_bio = []
    for label, valeur, ref, (statut_txt, statut_color) in bio_lignes:
        statut_para = Paragraph(
            f"<b>{statut_txt}</b>",
            ParagraphStyle("_s", fontName="Helvetica-Bold",
                           fontSize=9, textColor=statut_color),
        )
        lignes_bio.append([label, valeur, ref, statut_para])

    data_bio = entete_bio + lignes_bio
    col_w_bio = [largeur_utile * p for p in [0.32, 0.21, 0.28, 0.19]]
    tbl_bio = Table(data_bio, colWidths=col_w_bio)
    tbl_bio.setStyle(_style_tableau_base(len(data_bio), 4))
    elements.append(tbl_bio)

    # ── SECTION 4 — SCORE DE RISQUE ET SHAP ──────────────────────────────────
    elements.append(Paragraph("Score de risque calculé par IA", styles["section"]))

    score   = prediction.get("score", 0)
    niveau  = prediction.get("niveau", "faible").lower()
    message = prediction.get("message", "")

    # Choix des couleurs selon le niveau de risque
    if score >= 61:
        bg_color    = C_ROUGE_BG
        txt_color   = C_ROUGE_TXT
        niveau_label = "ÉLEVÉ"
    elif score >= 31:
        bg_color    = C_ORANGE_BG
        txt_color   = C_ORANGE_TXT
        niveau_label = "MODÉRÉ"
    else:
        bg_color    = C_VERT_BG
        txt_color   = C_VERT_TXT
        niveau_label = "FAIBLE"

    # Encadré score — tableau 1 cellule
    score_style = ParagraphStyle(
        "_score", fontName="Helvetica-Bold",
        fontSize=20, textColor=txt_color, alignment=TA_CENTER,
    )
    msg_style = ParagraphStyle(
        "_msg", fontName="Helvetica",
        fontSize=9, textColor=txt_color, alignment=TA_CENTER,
    )
    score_para = Paragraph(
        f"Score : {score:.0f} / 100 — Niveau : {niveau_label}",
        score_style,
    )
    msg_para = Paragraph(message, msg_style)

    encadre = Table(
        [[score_para], [msg_para]],
        colWidths=[largeur_utile],
    )
    encadre.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg_color),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4]),
        ("BOX",           (0, 0), (-1, -1), 1, txt_color),
    ]))
    elements.append(encadre)
    elements.append(Spacer(1, 5 * mm))

    # Tableau SHAP — trié par valeur absolue décroissante
    elements.append(Paragraph(
        "Facteurs contribuant au risque (SHAP)", styles["section"]
    ))

    shap_values: dict = prediction.get("shap_values", {})
    shap_trie = sorted(
        shap_values.items(),
        key=lambda kv: abs(kv[1]),
        reverse=True,
    )

    entete_shap = [["Variable", "Contribution", "Direction"]]
    lignes_shap = []
    for feat, val in shap_trie:
        if val > 0:
            dir_para = Paragraph(
                "RISQUE (+)",
                ParagraphStyle("_r", fontName="Helvetica-Bold",
                               fontSize=9, textColor=C_ROUGE_TXT),
            )
        else:
            dir_para = Paragraph(
                "PROTECTION (−)",
                ParagraphStyle("_p", fontName="Helvetica-Bold",
                               fontSize=9, textColor=C_VERT_TXT),
            )
        lignes_shap.append([feat.replace("_", " ").capitalize(),
                             f"{val:+.4f}", dir_para])

    data_shap = entete_shap + lignes_shap
    col_w_shap = [largeur_utile * p for p in [0.45, 0.25, 0.30]]
    tbl_shap = Table(data_shap, colWidths=col_w_shap)
    tbl_shap.setStyle(_style_tableau_base(len(data_shap), 3))
    elements.append(tbl_shap)

    # ── SECTION 5 — RECOMMANDATIONS ───────────────────────────────────────────
    elements.append(Paragraph("Recommandations médicales", styles["section"]))

    recommandations = {
        "faible": [
            "Maintenir une alimentation équilibrée.",
            "Pratiquer 30 minutes d'activité physique par jour.",
            "Bilan biologique annuel recommandé.",
            "Surveiller le poids (IMC cible < 25 kg/m²).",
        ],
        "modere": [
            "Réduire la consommation de sucres raffinés.",
            "Marche rapide 30 à 45 minutes par jour minimum.",
            "Contrôle de la glycémie tous les 6 mois.",
            "Consultation avec un nutritionniste recommandée.",
            "Objectif : réduire l'IMC sous 25 kg/m² si surpoids.",
        ],
        "eleve": [
            "Consultation endocrinologue dans les 4 semaines.",
            "Contrôle de la glycémie à jeun tous les mois.",
            "HbA1c à contrôler tous les 3 mois.",
            "Régime alimentaire strict — éviter sucres et graisses saturées.",
            "Activité physique encadrée par un professionnel de santé.",
            "Arrêt du tabac si fumeur.",
        ],
    }

    for rec in recommandations.get(niveau, recommandations["faible"]):
        elements.append(Paragraph(f"• {rec}", styles["recommandation"]))

    # ── Construction du document ──────────────────────────────────────────────
    doc.build(
        elements,
        onFirstPage=_draw_footer,
        onLaterPages=_draw_footer,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
