from sqlalchemy.orm import Session
from app.models.models import Student


def get_students(db: Session):
    return db.query(Student).all()


def get_student(db: Session, student_id: int):
    return (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )


def get_student_by_roll(db: Session, roll_number: str):
    return (
        db.query(Student)
        .filter(Student.roll_number == roll_number)
        .first()
    )


def create_student(db: Session, student: Student):
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student: Student):
    db.delete(student)
    db.commit()

def update_student(db: Session, student: Student, data):
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return student


def get_students_by_classroom(
    db: Session,
    classroom_id: int,
):
    return (
        db.query(Student)
        .filter(Student.classroom_id == classroom_id)
        .all()
    )


def get_student_by_rfid(
    db: Session,
    rfid_tag: str,
):
    return (
        db.query(Student)
        .filter(Student.rfid_tag == rfid_tag)
        .first()
    )


def get_student_by_ble(
    db: Session,
    ble_beacon_id: str,
):
    return (
        db.query(Student)
        .filter(Student.ble_beacon_id == ble_beacon_id)
        .first()
    )


def count_students(db: Session):
    return db.query(Student).count()