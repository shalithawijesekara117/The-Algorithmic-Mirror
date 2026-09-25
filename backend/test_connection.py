import asyncio
import sys
from app.database import connect_to_mongo, db_instance, close_mongo_connection
from app.models import UserBase, DigitalHabits, MentalProfile
from app.services.gemini_service import evaluate_mental_health_risk

async def test_backend():
    print("========================================")
    print("Testing Algorithmic Mirror Backend & DB")
    print("========================================")
    
    # 1. Test Database connection
    await connect_to_mongo()
    if db_instance.client:
        print("[OK] MongoDB Connection: SUCCESSFUL")
    else:
        print("[WARN] MongoDB Connection: UNREACHABLE (Fallback heuristic mode enabled)")
        
    # 2. Test AI Risk Engine
    user = UserBase(name="Test User", age=22, gender="Female")
    habits = DigitalHabits(screen_time=8.0, sleep_hours=5.0, social_activity_hours=1.0, social_media_platform="TikTok")
    mental = MentalProfile(stress_level=8, anxiety_level=7, depression_level=5)
    
    print("\nRunning Risk Evaluation...")
    recommendation = await evaluate_mental_health_risk(user, habits, mental)
    
    print(f"[OK] Risk Category: {recommendation.risk_category}")
    print(f"[OK] Risk Score: {recommendation.risk_score}%")
    print(f"[OK] Summary: {recommendation.summary}")
    print("[OK] Action Advice:")
    for advice in recommendation.recommendation_advice:
        print(f"   - {advice}")

    await close_mongo_connection()
    print("\nBackend connection & calculation test complete.")

if __name__ == "__main__":
    asyncio.run(test_backend())

