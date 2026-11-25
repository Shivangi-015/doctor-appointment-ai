from app.database import get_db_connection

connection = get_db_connection()

doctors = connection.execute(
    "SELECT * FROM doctors"
).fetchall()

slots = connection.execute(
    "SELECT * FROM available_slots"
).fetchall()

print("Doctors:", len(doctors))
print("Available slots:", len(slots))

for doctor in doctors:
    print(dict(doctor))

connection.close()