import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.adaptive_exam_service import AdaptiveExamService, TIER_MULTIPLIERS, TIER_ORDER

def test_adaptive_logic():
    print("=== Testing Adaptive IRT Engine Logic ===")

    # 1. Start from MEDIUM
    tier = "MEDIUM"
    streak = 0
    theta = 50.0

    print(f"Initial: Tier={tier}, Streak={streak}, Theta={theta}")
    assert tier == "MEDIUM"

    # Candidate answers 1st question correctly
    streak = streak + 1 if streak >= 0 else 1
    next_tier = AdaptiveExamService.compute_next_tier(tier, is_correct=True, streak=streak)
    theta = AdaptiveExamService.update_theta_score(theta, tier, is_correct=True, streak=streak)
    print(f"Step 1 (Correct): NextTier={next_tier}, Streak={streak}, Theta={theta:.1f}")
    assert streak == 1
    assert theta > 50.0

    # Candidate answers 2nd question correctly (streak = 2 -> upgraded to HARD)
    streak = streak + 1
    next_tier = AdaptiveExamService.compute_next_tier(next_tier, is_correct=True, streak=streak)
    theta = AdaptiveExamService.update_theta_score(theta, "MEDIUM", is_correct=True, streak=streak)
    print(f"Step 2 (Correct): NextTier={next_tier}, Streak={streak}, Theta={theta:.1f}")
    assert next_tier == "HARD"
    assert streak == 2

    # Candidate answers 3rd question correctly on HARD (streak = 3 -> upgraded to EXPERT)
    streak = streak + 1
    next_tier = AdaptiveExamService.compute_next_tier(next_tier, is_correct=True, streak=streak)
    theta = AdaptiveExamService.update_theta_score(theta, "HARD", is_correct=True, streak=streak)
    print(f"Step 3 (Correct): NextTier={next_tier}, Streak={streak}, Theta={theta:.1f}")
    assert next_tier == "EXPERT"

    # Candidate answers incorrectly on EXPERT -> steps down to HARD
    streak = -1
    next_tier = AdaptiveExamService.compute_next_tier(next_tier, is_correct=False, streak=streak)
    theta = AdaptiveExamService.update_theta_score(theta, "EXPERT", is_correct=False, streak=streak)
    print(f"Step 4 (Incorrect on EXPERT): NextTier={next_tier}, Streak={streak}, Theta={theta:.1f}")
    assert next_tier == "HARD"

    # Candidate answers incorrectly on HARD -> steps down to MEDIUM
    streak = -2
    next_tier = AdaptiveExamService.compute_next_tier(next_tier, is_correct=False, streak=streak)
    theta = AdaptiveExamService.update_theta_score(theta, "HARD", is_correct=False, streak=streak)
    print(f"Step 5 (Incorrect on HARD): NextTier={next_tier}, Streak={streak}, Theta={theta:.1f}")
    assert next_tier == "MEDIUM"

    # 2. Test Multipliers
    assert TIER_MULTIPLIERS["EASY"] == 1.0
    assert TIER_MULTIPLIERS["MEDIUM"] == 1.5
    assert TIER_MULTIPLIERS["HARD"] == 2.2
    assert TIER_MULTIPLIERS["EXPERT"] == 3.0
    print("Multipliers verified: Easy 1.0x, Med 1.5x, Hard 2.2x, Expert 3.0x")

    # 3. Test Skill Ceiling Calculation
    dist_expert = {
        "EASY": {"attempted": 2, "correct": 2},
        "MEDIUM": {"attempted": 5, "correct": 5},
        "HARD": {"attempted": 5, "correct": 4},
        "EXPERT": {"attempted": 3, "correct": 2},
    }
    ceiling_high = AdaptiveExamService.calculate_skill_ceiling(82.0, dist_expert)
    print(f"Ceiling with Expert solves: {ceiling_high}")
    assert ceiling_high == "EXPERT_ARCHITECTURE"

    dist_foundational = {
        "EASY": {"attempted": 8, "correct": 4},
        "MEDIUM": {"attempted": 7, "correct": 2},
        "HARD": {"attempted": 0, "correct": 0},
        "EXPERT": {"attempted": 0, "correct": 0},
    }
    ceiling_low = AdaptiveExamService.calculate_skill_ceiling(35.0, dist_foundational)
    print(f"Ceiling with low score & Theta 35.0: {ceiling_low}")
    assert ceiling_low == "FOUNDATIONAL_JUNIOR"

    print("\n>>> All Adaptive Testing Service Logic Tests Passed Successfully! <<<")

if __name__ == "__main__":
    test_adaptive_logic()
