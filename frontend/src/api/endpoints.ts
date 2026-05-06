import api from './axios';
import {
  LoginResponse,
  Medecin,
  MedecinUpdate,
  PasswordChange,
  Patient,
  PatientPayload,
  PredictionRequest,
  PredictionResponse,
  Score,
  ScoreCreate,
} from '../types';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  const { data } = await api.post<LoginResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

export const register = async (
  nom: string,
  prenom: string,
  email: string,
  password: string
): Promise<Medecin> => {
  const { data } = await api.post<Medecin>('/auth/register', {
    nom,
    prenom,
    email,
    password,
  });
  return data;
};

export const getProfile = async (): Promise<Medecin> => {
  const { data } = await api.get<Medecin>('/auth/me');
  return data;
};

export const updateProfile = async (payload: MedecinUpdate): Promise<LoginResponse> => {
  const { data } = await api.put<LoginResponse>('/auth/me', payload);
  return data;
};

export const changePassword = async (payload: PasswordChange): Promise<void> => {
  await api.put('/auth/me/password', payload);
};

export const predict = async (payload: PredictionRequest): Promise<PredictionResponse> => {
  const { data } = await api.post<PredictionResponse>('/predict/', payload);
  return data;
};

export const createScore = async (payload: ScoreCreate): Promise<void> => {
  await api.post('/scores/', payload);
};

export const getPatients = async (): Promise<Patient[]> => {
  const { data } = await api.get<Patient[]>('/patients/');
  return data;
};

export const createPatient = async (patient: PatientPayload): Promise<Patient> => {
  const { data } = await api.post<Patient>('/patients/', patient);
  return data;
};

export const getPatient = async (id: number): Promise<Patient> => {
  const { data } = await api.get<Patient>(`/patients/${id}`);
  return data;
};

export const getPatientScores = async (id: number): Promise<Score[]> => {
  const { data } = await api.get<Score[]>(`/patients/${id}/scores`);
  return data;
};

export const updatePatient = async (id: number, patient: PatientPayload): Promise<Patient> => {
  const { data } = await api.put<Patient>(`/patients/${id}`, patient);
  return data;
};

export const deletePatient = async (id: number): Promise<void> => {
  await api.delete(`/patients/${id}`);
};

export const downloadPDF = async (id: number): Promise<void> => {
  const { data } = await api.get(`/patients/${id}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `rapport_patient_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
