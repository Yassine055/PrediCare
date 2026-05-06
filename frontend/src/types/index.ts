export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  age: number;
  imc: number;
  glycemie_jeun: number;
  hba1c: number;
  tension_systolique: number;
  tension_diastolique: number;
  hdl: number;
  ldl: number;
  creatinine: number;
  tabac: number;
  antecedents_familiaux: number;
  medecin_id?: number;
  created_at?: string;
  // Dernier score de prédiction ML (retourné par GET /patients/)
  last_score?: number;
  last_niveau?: string;
  last_score_date?: string;
}

export type PatientPayload = Omit<
  Patient,
  'id' | 'medecin_id' | 'created_at' | 'last_score' | 'last_niveau' | 'last_score_date'
>;

export interface PredictionRequest {
  age: number;
  imc: number;
  glycemie_jeun: number;
  hba1c: number;
  tension_systolique: number;
  tension_diastolique: number;
  hdl: number;
  ldl: number;
  creatinine: number;
  tabac: number;
  antecedents_familiaux: number;
}

export interface ShapValues {
  [key: string]: number;
}

export interface PredictionResponse {
  score: number;
  niveau: string;
  probabilite: number;
  shap_values: ShapValues;
  message: string;
}

export interface ScoreCreate {
  patient_id: number;
  score: number;
  niveau: string;
  probabilite: number;
  shap_values: ShapValues;
}

export interface Score extends ScoreCreate {
  id: number;
  created_at: string;
}

export interface MedecinInfo {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface Medecin extends MedecinInfo {
  is_active: boolean;
  created_at: string;
}

export interface MedecinUpdate {
  nom: string;
  prenom: string;
  email: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  medecin: MedecinInfo;
}
