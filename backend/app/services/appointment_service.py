
from app.database import get_db_connection


def get_all_doctors():
    connection = get_db_connection()

    try:
        doctors = connection.execute(
            "SELECT * FROM doctors"
        ).fetchall()

        return [dict(doctor) for doctor in doctors]
    finally:
        connection.close()


def get_available_slots(doctor_id, slot_date):
    connection = get_db_connection()

    try:
        slots = connection.execute("""
            SELECT slot_id, slot_date, slot_time
            FROM available_slots
            WHERE doctor_id = ?
            AND slot_date = ?
            AND status = 'available'
            ORDER BY slot_time
        """, (doctor_id, slot_date)).fetchall()

        return [dict(slot) for slot in slots]
    finally:
        connection.close()


def book_appointment(patient_name, phone, slot_id):
    connection = get_db_connection()

    try:
        # Lock the database for this booking transaction.
        connection.execute("BEGIN IMMEDIATE")

        slot = connection.execute("""
            SELECT * FROM available_slots
            WHERE slot_id = ? AND status = 'available'
        """, (slot_id,)).fetchone()

        if not slot:
            raise ValueError("This appointment slot is not available.")

        connection.execute("""
            INSERT OR IGNORE INTO patients (name, phone)
            VALUES (?, ?)
        """, (patient_name.strip(), phone.strip()))

        patient = connection.execute(
            "SELECT patient_id FROM patients WHERE phone = ?",
            (phone.strip(),)
        ).fetchone()

        connection.execute("""
            UPDATE available_slots
            SET status = 'booked'
            WHERE slot_id = ? AND status = 'available'
        """, (slot_id,))

        appointment = connection.execute("""
            INSERT INTO appointments (patient_id, slot_id)
            VALUES (?, ?)
        """, (patient["patient_id"], slot_id))

        connection.commit()

        return {
            "message": "Appointment booked successfully!",
            "appointment_id": appointment.lastrowid,
            "slot_id": slot_id
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def cancel_appointment(appointment_id, phone):
    connection = get_db_connection()

    try:
        connection.execute("BEGIN IMMEDIATE")

        appointment = connection.execute("""
            SELECT a.slot_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.appointment_id = ?
            AND p.phone = ?
            AND a.status = 'confirmed'
        """, (appointment_id, phone.strip())).fetchone()

        if not appointment:
            raise ValueError(
                "Appointment not found or already cancelled."
            )

        connection.execute("""
            UPDATE appointments
            SET status = 'cancelled'
            WHERE appointment_id = ?
        """, (appointment_id,))

        connection.execute("""
            UPDATE available_slots
            SET status = 'available'
            WHERE slot_id = ?
        """, (appointment["slot_id"],))

        connection.commit()

        return {"message": "Appointment cancelled successfully!"}

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
