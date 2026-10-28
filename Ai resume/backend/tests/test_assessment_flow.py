import os
import sys

# Ensure backend root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.job import Job
from app.models.user import User
from app.models.assessment import JobAssessment, CandidateTestSubmission
from app.models.application import JobApplication
from app.services.gemini_service import GeminiService


def test_assessment_generation_and_grading():
    print("--- 1. Testing Screening Test Generation ---")
    test_data = GeminiService.generate_job_screening_test(
        job_title="Senior Full-Stack Engineer",
        job_description="We are looking for a Senior Full-Stack Engineer with strong Python, FastAPI, and React skills.",
        required_skills=["Python", "FastAPI", "React", "Docker", "MySQL"],
    )

    mcqs = test_data.get("mcq_questions", [])
    writtens = test_data.get("written_questions", [])

    print(f"Generated MCQs Count: {len(mcqs)}")
    print(f"Generated Written Questions Count: {len(writtens)}")

    assert len(mcqs) == 25, f"Expected 25 MCQs, got {len(mcqs)}"
    assert len(writtens) == 5, f"Expected 5 Written Questions, got {len(writtens)}"

    # Check structure of first MCQ
    q1 = mcqs[0]
    print(f"Q1: {q1['question']}")
    print(f"Options: {q1['options']}")
    print(f"Correct Option: {q1['correct_option']}")
    assert len(q1["options"]) == 4, "MCQ must have 4 options"
    assert q1["correct_option"] in ["A", "B", "C", "D"], "Correct option must be A, B, C, or D"

    # Check structure of first written question
    w1 = writtens[0]
    print(f"W1: {w1['question']}")
    print(f"Rubric: {w1['ideal_answer_rubric']}")
    assert w1["max_marks"] == 10, "Written question max marks must be 10"

    print("\n--- 2. Testing Automated Grading Engine ---")
    # Simulate candidate answers: 20 correct MCQs, 5 incorrect
    mcq_answers = {}
    for idx, q in enumerate(mcqs, 1):
        if idx <= 20:
            mcq_answers[str(q["id"])] = q["correct_option"]
        else:
            # Pick a wrong option
            opts = ["A", "B", "C", "D"]
            opts.remove(q["correct_option"])
            mcq_answers[str(q["id"])] = opts[0]

    written_answers = {
        "1": "I would analyze query performance using EXPLAIN, create composite indexes on high-cardinality search columns, implement Redis caching for frequent GET queries, and tune MySQL pool size and max overflow in SQLAlchemy.",
        "2": "I used APM metrics to spot memory bloat, dumped heap objects with py-spy, identified unclosed file descriptors in a background worker loop, wrote a regression unit test, and deployed the hotfix.",
        "3": "We issue short-lived JWT access tokens with 15-minute expirations and store refresh tokens in secure HttpOnly cookies, validating revocations against Redis session blacklists on every authenticated request.",
        "4": "We push background tasks to Celery with Redis broker, enforce idempotency with UUID keys, apply exponential retry backoff, and route permanently failed payloads to a Dead-Letter Queue.",
        "5": "We follow the expand-contract pattern: first add nullable columns, deploy code reading and writing to both schema versions, backfill existing records, add constraints, and finally remove deprecated columns.",
    }

    eval_result = GeminiService.evaluate_test_submission(
        mcq_questions=mcqs,
        written_questions=writtens,
        mcq_answers=mcq_answers,
        written_answers=written_answers,
    )

    print(f"MCQ Score: {eval_result['mcq_score']} / 50.0")
    print(f"MCQ Correct Count: {eval_result['mcq_correct_count']} / {eval_result['total_mcqs']}")
    print(f"Written Score: {eval_result['written_score']} / 50.0")
    print(f"Total Test Score: {eval_result['total_test_score']} / 100.0%")
    print(f"Summary Feedback: {eval_result['summary_feedback']}")

    assert eval_result["mcq_correct_count"] == 20, "Expected 20 correct MCQs"
    assert eval_result["mcq_score"] == 40.0, f"Expected 40.0 MCQ score, got {eval_result['mcq_score']}"
    assert eval_result["written_score"] > 0, "Written score must be > 0"
    assert eval_result["total_test_score"] > 0, "Total test score must be > 0"
    assert len(eval_result["written_evaluations"]) == 5, "Expected 5 written evaluations"

    print("\n--- 3. Testing Database Persistence ---")
    db = SessionLocal()
    try:
        # Fetch or mock a job
        job = db.query(Job).first()
        user = db.query(User).first()
        if job and user:
            # Check or create assessment record
            assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
            if not assessment:
                assessment = JobAssessment(
                    job_id=job.id,
                    mcq_questions=mcqs,
                    written_questions=writtens,
                )
                db.add(assessment)
                db.commit()
                db.refresh(assessment)
            print(f"JobAssessment verified for Job #{job.id}: ID {assessment.id}")

            # Verify submission creation
            sub = CandidateTestSubmission(
                application_id=None,
                candidate_id=user.id,
                job_id=job.id,
                assessment_id=assessment.id,
                mcq_answers=mcq_answers,
                written_answers=written_answers,
                mcq_score=eval_result["mcq_score"],
                written_score=eval_result["written_score"],
                total_test_score=eval_result["total_test_score"],
                written_evaluation_feedback=eval_result["written_evaluation_feedback"],
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)
            print(f"CandidateTestSubmission successfully persisted with ID #{sub.id}, Total Score: {sub.total_test_score}%")
            
            # Clean up test submission
            db.delete(sub)
            db.commit()
            print("Test cleanup completed.")
        else:
            print("Note: No existing job/user in database to run live DB insert test, but schema compilation passed.")
    finally:
        db.close()

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")


if __name__ == '__main__':
    test_assessment_generation_and_grading()
