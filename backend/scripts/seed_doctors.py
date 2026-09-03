"""Idempotent sample-doctor seed for local development.

Only inserts doctors whose username doesn't already exist — safe to re-run,
never touches or duplicates existing rows (including the pre-existing
`drsmith` account). Run from backend/ with:

    ./venv/Scripts/python.exe scripts/seed_doctors.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password
from app.database import SessionLocal
from app.models import Doctor

SAMPLE_DOCTORS = [
    dict(
        username="drmehta",
        password="doctor123",
        full_name="Dr. Aditi Mehta",
        email="aditi.mehta@example.com",
        specialization="Cardiology",
        qualification="MBBS, MD (Cardiology)",
        experience_years=12,
        bio="Specialises in preventive cardiology and non-invasive cardiac diagnostics.",
        consultation_fee=800,
        clinic_name="HeartCare Clinic",
        clinic_address="14 MG Road, Connaught Place",
        city="Delhi",
        gender="Female",
        supports_clinic=True,
        supports_video=True,
        available_days="Mon,Tue,Wed,Thu,Fri",
    ),
    dict(
        username="drkhan",
        password="doctor123",
        full_name="Dr. Imran Khan",
        email="imran.khan@example.com",
        specialization="Dermatology",
        qualification="MBBS, MD (Dermatology)",
        experience_years=8,
        bio="Focus on acne, pigmentation and skin allergy management.",
        consultation_fee=600,
        clinic_name="Skin & Glow Clinic",
        clinic_address="22 Brigade Road",
        city="Bengaluru",
        gender="Male",
        supports_clinic=True,
        supports_video=False,
        available_days="Mon,Wed,Fri,Sat",
    ),
    dict(
        username="drrao",
        password="doctor123",
        full_name="Dr. Lakshmi Rao",
        email="lakshmi.rao@example.com",
        specialization="Paediatrics",
        qualification="MBBS, DCH",
        experience_years=15,
        bio="Over 15 years treating infants, children and adolescents.",
        consultation_fee=500,
        clinic_name="Little Steps Children's Clinic",
        clinic_address="9 Anna Salai",
        city="Chennai",
        gender="Female",
        supports_clinic=True,
        supports_video=True,
        available_days="Tue,Wed,Thu,Fri,Sat",
    ),
    dict(
        username="drverma",
        password="doctor123",
        full_name="Dr. Rohan Verma",
        email="rohan.verma@example.com",
        specialization="Orthopaedics",
        qualification="MBBS, MS (Ortho)",
        experience_years=10,
        bio="Sports injuries, joint replacement and spine care.",
        consultation_fee=700,
        clinic_name="Bone & Joint Institute",
        clinic_address="5 Park Street",
        city="Kolkata",
        gender="Male",
        supports_clinic=True,
        supports_video=False,
        available_days="Mon,Tue,Thu,Fri",
    ),
    dict(
        username="drjoseph",
        password="doctor123",
        full_name="Dr. Anna Joseph",
        email="anna.joseph@example.com",
        specialization="General Medicine",
        qualification="MBBS, MD (General Medicine)",
        experience_years=6,
        bio="General health, fevers, and lifestyle-condition management, online-first.",
        consultation_fee=400,
        clinic_name=None,
        clinic_address=None,
        city="Mumbai",
        gender="Female",
        supports_clinic=False,
        supports_video=True,
        available_days="Mon,Tue,Wed,Thu,Fri,Sat",
    ),
]


def run() -> None:
    db = SessionLocal()
    try:
        created = 0
        for entry in SAMPLE_DOCTORS:
            exists = db.query(Doctor).filter(Doctor.username == entry["username"]).first()
            if exists:
                continue
            entry = dict(entry)
            entry["password"] = hash_password(entry["password"])
            db.add(Doctor(**entry))
            created += 1
        db.commit()
        print(f"Seeded {created} new doctor(s); {len(SAMPLE_DOCTORS) - created} already present.")

        # Backfill a profile for the pre-existing drsmith account if it has
        # none yet — never touches its username/password/email.
        smith = db.query(Doctor).filter(Doctor.username == "drsmith").first()
        if smith and not smith.specialization:
            smith.specialization = "General Medicine"
            smith.qualification = "MBBS"
            smith.experience_years = 9
            smith.bio = "General practitioner handling routine consultations and follow-ups."
            smith.consultation_fee = 500
            smith.clinic_name = "City Health Clinic"
            smith.clinic_address = "1 Main Street"
            smith.city = "Delhi"
            smith.supports_clinic = True
            smith.supports_video = True
            smith.available_days = "Mon,Tue,Wed,Thu,Fri"
            db.commit()
            print("Backfilled profile for existing drsmith account.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
