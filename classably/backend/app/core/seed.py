import logging
from sqlalchemy.orm import Session

from app.auth.security import hash_password

logger = logging.getLogger(__name__)


def seed_production_data(db: Session):
    """
    Populates database with realistic enterprise production data
    if essential tables are empty.
    """
    from app.models.entities.user import User
    from app.models.entities.academic import Department, Course, AcademicYear, Semester, Subject, Building, Floor
    from app.models.entities.classroom import Classroom
    from app.models.entities.teacher import Teacher
    from app.models.entities.student import Student
    from app.models.entities.smart_classroom import SmartDevice
    from app.models.entities.lecture import LectureSession, LiveSubtitle, LectureNote

    try:
        # Check if users exist
        user_count = db.query(User).count()
        if user_count > 0:
            logger.info("Database already seeded with user data.")
            return

        logger.info("Seeding production enterprise data into database...")

        # 1. Create Core Users
        admin_user = User(
            full_name="System Administrator",
            email="admin@classably.edu",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
            phone="+1-800-555-0199",
        )
        teacher_user = User(
            full_name="Dr. Sarah Jenkins",
            email="teacher@classably.edu",
            password_hash=hash_password("teacher123"),
            role="teacher",
            is_active=True,
            phone="+1-800-555-0144",
        )
        student_user = User(
            full_name="Alex Rivera",
            email="student@classably.edu",
            password_hash=hash_password("student123"),
            role="student",
            is_active=True,
            phone="+1-800-555-0177",
        )

        db.add_all([admin_user, teacher_user, student_user])
        db.flush()

        # 2. Departments & Courses
        dept_cse = Department(
            code="CSE",
            name="Computer Science & Engineering",
            description="Department of Computer Science, AI, and Assistive Systems",
            head_of_department="Dr. Alan Turing",
        )
        dept_ece = Department(
            code="ECE",
            name="Electronics & Assistive Tech",
            description="Department of Smart Embedded Systems and Robotics",
            head_of_department="Dr. Claude Shannon",
        )
        db.add_all([dept_cse, dept_ece])
        db.flush()

        course_ai = Course(
            department_id=dept_cse.id,
            code="CS-AI",
            name="B.Tech Computer Science & AI",
            duration_years=4,
            description="Specialization in Machine Vision and Accessibility AI",
        )
        course_rob = Course(
            department_id=dept_ece.id,
            code="ROB-AT",
            name="B.Tech Robotics & Accessibility",
            duration_years=4,
            description="Robotics, IoT, and Physical Assistive Hardware",
        )
        db.add_all([course_ai, course_rob])
        db.flush()

        # 3. Academic Year & Subject
        from datetime import date

        ay = AcademicYear(
            year_label="2026-2027",
            start_date=date(2026, 8, 1),
            end_date=date(2027, 5, 31),
            is_current=True,
        )
        db.add(ay)
        db.flush()

        sem = Semester(
            academic_year_id=ay.id,
            semester_number=5,
            name="Fall 2026 Semester",
            is_current=True,
        )
        db.add(sem)
        db.flush()

        subject_ai = Subject(
            course_id=course_ai.id,
            semester_id=sem.id,
            code="CS-501",
            name="Artificial Intelligence & Machine Learning",
            credits=4,
            description="Neural Networks, Vision OCR, and Speech Processing",
        )
        db.add(subject_ai)
        db.flush()

        # 4. Building & Classrooms
        bldg = Building(
            name="Tech Tower A",
            code="TTA",
            total_floors=4,
            has_elevator=True,
            has_wheelchair_ramps=True,
        )
        db.add(bldg)
        db.flush()

        for f_num in range(1, 5):
            fl = Floor(building_id=bldg.id, floor_number=f_num, name=f"Floor {f_num}")
            db.add(fl)
        db.flush()

        classroom_1 = Classroom(
            id=1,
            name="Room 101 - Smart Accessibility Lab",
            code="CR-101",
            building="Tech Tower A",
            floor=1,
            room_number="101",
            capacity=60,
            has_wheelchair_ramp=True,
            has_smart_board=True,
            has_audio_system=True,
        )
        classroom_2 = Classroom(
            id=2,
            name="Room 204 - AI & Robotics Studio",
            code="CR-204",
            building="Tech Tower A",
            floor=2,
            room_number="204",
            capacity=45,
            has_wheelchair_ramp=True,
            has_smart_board=True,
            has_audio_system=True,
        )
        db.add_all([classroom_1, classroom_2])
        db.flush()

        # 5. Teacher & Student Entities
        teacher_entity = Teacher(
            id=1,
            user_id=teacher_user.id,
            department_id=dept_cse.id,
            classroom_id=classroom_1.id,
            name="Dr. Sarah Jenkins",
            email="teacher@classably.edu",
            employee_id="EMP-1001",
            specialization="Computer Vision & Accessibility",
        )
        student_entity = Student(
            id=1,
            user_id=student_user.id,
            classroom_id=classroom_1.id,
            name="Alex Rivera",
            roll_number="2026-CS-001",
            email="student@classably.edu",
            disability_type="Visually Impaired",
            preferred_font_scale=1.25,
            preferred_theme="dark",
            voice_only_mode=True,
            screen_reader_enabled=True,
        )
        db.add_all([teacher_entity, student_entity])
        db.flush()

        # 6. Smart Devices
        devices = [
            SmartDevice(id=1, classroom_id=1, name="Smart Board OCR Camera", device_type="camera", serial_number="CAM-101", status="online"),
            SmartDevice(id=2, classroom_id=1, name="Classroom Lighting Relay", device_type="light", serial_number="LGT-101", status="online"),
            SmartDevice(id=3, classroom_id=1, name="Smart Climate Fan", device_type="fan", serial_number="FAN-101", status="online"),
            SmartDevice(id=4, classroom_id=1, name="Motorized Wheelchair Desk", device_type="desk", serial_number="DSK-101", status="online"),
            SmartDevice(id=5, classroom_id=1, name="Emergency Assistance Actuator", device_type="emergency_relay", serial_number="EMG-101", status="online"),
        ]
        db.add_all(devices)
        db.flush()

        # 7. Active Lecture Session & Notes
        session = LectureSession(
            id=1,
            classroom_id=1,
            teacher_id=teacher_entity.id,
            subject="Artificial Intelligence & Machine Learning",
            topic="Neural Networks & Multimodal Board OCR",
            status="ACTIVE",
        )
        db.add(session)
        db.flush()

        # Add subtitles
        subs = [
            LiveSubtitle(session_id=1, speaker_name="Dr. Sarah Jenkins", original_text="Welcome students! Today we are exploring Neural Networks and automatic OCR detection.", translated_text="Welcome students! Today we are exploring Neural Networks and automatic OCR detection.", language="en"),
            LiveSubtitle(session_id=1, speaker_name="Dr. Sarah Jenkins", original_text="Notice equation on the board: loss equals one half of target minus prediction squared.", translated_text="Notice equation on the board: loss equals one half of target minus prediction squared.", language="en"),
            LiveSubtitle(session_id=1, speaker_name="Dr. Sarah Jenkins", original_text="Our Gemini AI vision engine automatically scans the board and generates speech readouts for visually impaired students.", translated_text="Our Gemini AI vision engine automatically scans the board and generates speech readouts for visually impaired students.", language="en"),
        ]
        db.add_all(subs)

        # Add Lecture Note
        note = LectureNote(
            session_id=1,
            classroom_id=1,
            title="Artificial Intelligence & Machine Learning — Neural Networks & Multimodal Board OCR",
            raw_transcript="Welcome students! Today we are exploring Neural Networks and automatic OCR detection. Notice equation on the board: loss equals one half of target minus prediction squared. Our Gemini AI vision engine automatically scans the board and generates speech readouts for visually impaired students.",
            summary="Today's lecture introduced neural network architecture, loss function formulations, and multimodal computer vision board OCR. The Gemini AI engine automatically processes classroom board captures and builds natural text-to-speech audio readout scripts for blind students.",
            key_points=[
                "Neural network backpropagation relies on calculus and gradient descent optimization.",
                "Multimodal Gemini 2.0 Flash Vision performs live board OCR extraction.",
                "Automated audio speech readout scripts allow blind students to listen to complete board notes after class."
            ],
            formulas=["Loss = 0.5 * (Target - Prediction)^2", "Gradient = dLoss / dWeight"],
            definitions=["Multimodal OCR: Computer vision technology capable of processing image pixels alongside text prompts."],
        )
        db.add(note)

        db.commit()
        logger.info("Production enterprise database seeded successfully!")

    except Exception as e:
        db.rollback()
        logger.warning(f"Production database seeding warning: {e}")
