export interface WizardFormData {
  full_name: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  society: string;
  city: string;
  state: string;
  department: string;
  doctor: string;
  doctor_id: string;
  consultation_mode: string;
  appointment_date: string;
  time_slot: string;
  appointment_type: string;
  reason: string;
  symptoms: string;
  duration: string;
}

export const initialWizardFormData: WizardFormData = {
  full_name: "",
  mobile: "",
  email: "",
  gender: "",
  dob: "",
  society: "",
  city: "",
  state: "",
  department: "",
  doctor: "",
  doctor_id: "",
  consultation_mode: "",
  appointment_date: "",
  time_slot: "",
  appointment_type: "",
  reason: "",
  symptoms: "",
  duration: "",
};

export const STATES = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh",
  "West Bengal",
];

export const DEPARTMENTS = [
  "General Medicine",
  "Orthopaedics",
  "Cardiology",
  "Dermatology",
  "ENT",
  "Gynaecology",
  "Neurology",
  "Paediatrics",
  "Ophthalmology",
  "Psychiatry",
];

export const TIME_SLOTS = [
  "09:00 – 10:00",
  "10:00 – 11:00",
  "11:00 – 12:00",
  "12:00 – 13:00",
  "14:00 – 15:00",
  "15:00 – 16:00",
  "16:00 – 17:00",
];

export const REASONS = [
  "Fever",
  "Pain",
  "Routine Check-up",
  "Follow-up Visit",
  "Vaccination",
  "Lab Test",
  "Other",
];

export const DURATIONS = ["Today", "1–3 days", "1 week", "2–4 weeks", "More than 1 month"];
