from app.models.models import Student
from app.repositories.student_repository import (
    create_student,
    get_students,
    get_student,
    get_student_by_roll,
    get_student_by_rfid,
    get_student_by_ble,
    get_students_by_classroom,
    update_student,
    count_students,
    delete_student,
)


def list_students(db):
    return get_students(db)


def add_student(db, data):

    existing = get_student_by_roll(
        db,
        data.roll_number,
    )

    if existing:
        raise ValueError("Roll number already exists")

    if data.rfid_tag:
        existing = get_student_by_rfid(
            db,
            data.rfid_tag,
        )

        if existing:
            raise ValueError("RFID tag already exists")

    if data.ble_beacon_id:
        existing = get_student_by_ble(
            db,
            data.ble_beacon_id,
        )

        if existing:
            raise ValueError("BLE beacon ID already exists")

    student = Student(
        name=data.name,
        roll_number=data.roll_number,
        disability_type=data.disability_type,
        rfid_tag=data.rfid_tag,
        ble_beacon_id=data.ble_beacon_id,
        classroom_id=data.classroom_id,
        preferred_font_scale=data.preferred_font_scale,
        preferred_theme=data.preferred_theme,
        voice_only_mode=data.voice_only_mode,
    )

    return create_student(db, student)


def edit_student(db, student_id, data):
    student = get_student(db, student_id)

    if student is None:
        return None

    if (
        data.roll_number
        and data.roll_number != student.roll_number
    ):
        existing = get_student_by_roll(
            db,
            data.roll_number,
        )

        if existing:
            raise ValueError("Roll number already exists")

    if (
        data.rfid_tag
        and data.rfid_tag != student.rfid_tag
    ):
        existing = get_student_by_rfid(
            db,
            data.rfid_tag,
        )

        if existing:
            raise ValueError("RFID tag already exists")

    if (
        data.ble_beacon_id
        and data.ble_beacon_id != student.ble_beacon_id
    ):
        existing = get_student_by_ble(
            db,
            data.ble_beacon_id,
        )

        if existing:
            raise ValueError("BLE beacon ID already exists")

    return update_student(
        db,
        student,
        data,
    )


def get_student_details(
    db,
    student_id,
):
    return get_student(
        db,
        student_id,
    )


def get_classroom_students(
    db,
    classroom_id,
):
    return get_students_by_classroom(
        db,
        classroom_id,
    )


def get_student_statistics(db):
    return {
        "total_students": count_students(db)
    }


def remove_student(db, student_id):
    student = get_student(
        db,
        student_id,
    )

    if student is None:
        return None

    delete_student(
        db,
        student,
    )

    return student