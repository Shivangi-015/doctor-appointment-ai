
from datetime import date, timedelta

from app.database import get_db_connection


def seed_database():
    connection = get_db_connection()

    doctors = [
        ("Dr. Sharma", "Cardiologist", 800),
        ("Dr. Mehta", "Dermatologist", 600),
        ("Dr. Verma", "General Physician", 400),
    ]

    connection.executemany("""
        INSERT INTO doctors (name, specialization, consultation_fee)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM doctors WHERE name = ?
        )
    """, [
        (*doctor, doctor[0]) for doctor in doctors
    ])

    connection.commit()

    doctor_rows = connection.execute(
        "SELECT doctor_id FROM doctors"
    ).fetchall()

    slots = []

    for doctor in doctor_rows:
        for day in range(1, 8):
            slot_date = (date.today() + timedelta(days=day)).isoformat()

            for slot_time in ["09:00", "10:00", "11:00", "14:00", "15:00"]:
                slots.append((
                    doctor["doctor_id"],
                    slot_date,
                    slot_time
                ))

    connection.executemany("""
        INSERT OR IGNORE INTO available_slots
        (doctor_id, slot_date, slot_time)
        VALUES (?, ?, ?)
    """, slots)

    connection.commit()
    connection.close()
