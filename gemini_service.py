import os
import json
import logging
from app.models import DigitalHabits, MentalProfile, UserBase, Recommendation

logger = logging.getLogger("uvicorn")


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

# Model-driven tier-based advices dictionary stored in backend
ADVICE_MODEL_TIERS = {
    "Low Risk": {
        "range": "0-25%",
        "min_score": 0.0,
        "max_score": 25.0,
        "category": "Low Risk",
        "advices": [
            "maintain your regular sleep schedule(6 to 7 hours sleep)",
            "Keep social media use balanced with offline activities",
            "Take regular breaks from screens.",
            "Continue physical activity and hobbies.",
            "Avoid using social media right before sleeping"
        ]
    },
    "Moderate Risk": {
        "range": "25–50%",
        "min_score": 25.0,
        "max_score": 50.0,
        "category": "Moderate Risk",
        "advices": [
            "Try reducing social media use by around 30–60 minutes per day.",
            "Aim for approximately 7–9 hours of sleep.",
            "Take a 5–10 minute break after extended screen use.",
            "Spend some time each day doing offline activities.",
            "Avoid scrolling continuously before bedtime."
        ]
    },
    "High Risk": {
        "range": "50–75%",
        "min_score": 50.0,
        "max_score": 75.0,
        "category": "High Risk",
        "advices": [
            "Set a daily limit for social media apps.",
            "Gradually reduce unnecessary social media usage.",
            "Create a consistent sleep/wake schedule.",
            "Aim for approximately 7–9 hours of sleep",
            "Keep the phone away from the bed at night.",
            "Replace some social-media time with exercise, hobbies, or time with friends/family.",
            "try drawing, singing, listening to music, reading.",
            "try to engage in sports",
            "If stress is interfering with daily life, consider reaching out to 1926 (NIMH Helpline) or talking with a trusted person."
        ]
    },
    "Very High Risk": {
        "range": "75–100%",
        "min_score": 75.0,
        "max_score": 100.0,
        "category": "Very High Risk",
        "advices": [
            "Use social media strictly only for essential purposes",
            "Establish a regular 7–9 hour sleep routine.",
            "Avoid social media close to bedtime.",
            "Use app limits or temporarily disable non-essential notifications.",
            "Include relaxing/offline activities in your daily routine.",
            "talk with people, try making new friends",
            "try raising a pet",
            "If you are experiencing persistent stress or depression, reach out toll-free to 1926 (NIMH Sri Lanka) or 1333 (CCCline) for confidential support."
        ]
    }
}

def get_model_advice_and_category(risk_score: float) -> tuple[str, list[str]]:
    """
    Tier-based advice and category generation according to user specification:
    - 0–25%: Low Risk
    - 25–50%: Moderate Risk
    - 50–75%: High Risk
    - 75–100%: Very High Risk
    """
    if risk_score <= 25.0:
        tier = ADVICE_MODEL_TIERS["Low Risk"]
    elif risk_score <= 50.0:
        tier = ADVICE_MODEL_TIERS["Moderate Risk"]
    elif risk_score <= 75.0:
        tier = ADVICE_MODEL_TIERS["High Risk"]
    else:
        tier = ADVICE_MODEL_TIERS["Very High Risk"]
    return tier["category"], list(tier["advices"])

def get_heuristic_assessment(user: UserBase, habits: DigitalHabits, mental: MentalProfile) -> Recommendation:
    """Fallback rule-based assessment algorithm when Gemini API is unavailable."""
    platforms = habits.social_media_platform
    if isinstance(platforms, list):
        platform_str = ", ".join(platforms) if platforms else "Social Media"
    else:
        platform_str = str(platforms)

    # Screen time factor (higher screen time -> higher risk weight)
    screen_factor = min(1.0, habits.screen_time / 12.0) * 30
    
    # Sleep deficit factor (< 7h increases risk)
    sleep_deficit = max(0.0, 8.0 - habits.sleep_hours) / 8.0 * 25
    
    # Mental profile factor (Stress, Anxiety, Depression averages out of 10)
    mental_avg = (mental.stress_level + mental.anxiety_level + mental.depression_level) / 3.0
    mental_factor = (mental_avg / 10.0) * 45
    
    total_score = min(100.0, round(screen_factor + sleep_deficit + mental_factor, 1))
    
    category, advice_list = get_model_advice_and_category(total_score)
        
    summary = f"User exhibits a {category.lower()} profile with a risk score of {total_score}%. Total screen time is {habits.screen_time}h across {platform_str} with {habits.sleep_hours}h sleep."
    
    return Recommendation(
        risk_category=category,
        risk_score=total_score,
        summary=summary,
        recommendation_advice=advice_list
    )

async def evaluate_mental_health_risk(user: UserBase, habits: DigitalHabits, mental: MentalProfile) -> Recommendation:
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or api_key == "your_gemini_api_key_here":
        logger.info("GEMINI_API_KEY not configured. Using Algorithmic Mirror AI Heuristic Engine.")
        return get_heuristic_assessment(user, habits, mental)
        
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        
        platforms = habits.social_media_platform
        if isinstance(platforms, list):
            platform_str = ", ".join(platforms)
        else:
            platform_str = str(platforms)

        prompt = f"""
        Act as an expert psychological AI analyst for 'The Algorithmic Mirror' framework.
        Evaluate the following user data:
        - User: Name: {user.name}, Age: {user.age}, Gender: {user.gender}
        - Digital Habits: Daily Screen Time: {habits.screen_time} hrs, Sleep: {habits.sleep_hours} hrs, Social Activity: {habits.social_activity_hours} hrs, Active Platforms: {platform_str}
        - Mental Profile (1-10 scale): Stress: {mental.stress_level}, Anxiety: {mental.anxiety_level}, Depression: {mental.depression_level}

        Calculate an accurate risk_score between 0 and 100 based on the balance of digital habits, sleep deprivation, and stress/anxiety levels.
        Provide a concise analytical overview summary.

        Output strict valid JSON only with this exact schema:
        {{
          "risk_score": <number between 0 and 100>,
          "summary": "<concise analytical overview>"
        }}
        """
        
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        text = response.text.strip()
        
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        data = json.loads(text)
        risk_score = float(data.get("risk_score", 50.0))
        category, advice_list = get_model_advice_and_category(risk_score)
        
        return Recommendation(
            risk_category=category,
            risk_score=risk_score,
            summary=data.get("summary", f"User exhibits a {category.lower()} profile ({risk_score}%)."),
            recommendation_advice=advice_list
        )
    except Exception as e:
        logger.warning(f"[Gemini Risk Assessment] {type(e).__name__}: {e}. Falling back to heuristic model.")
        return get_heuristic_assessment(user, habits, mental)

def get_heuristic_mood(stress_level: int, anxiety_level: int) -> dict:
    """Fallback linear scaling when Gemini API is unavailable."""
    return {
        "stress_percentage": round(min(100.0, max(0.0, stress_level * 10)), 1),
        "anxiety_percentage": round(min(100.0, max(0.0, anxiety_level * 10)), 1),
        "insight": "Estimated using linear scaling (AI analysis unavailable)."
    }

async def analyze_mood_percentages(stress_level: int, anxiety_level: int) -> dict:
    """AI-driven conversion of raw 1-10 self-reports into clinically-informed severity percentages."""
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "your_gemini_api_key_here":
        logger.info("GEMINI_API_KEY not configured. Using linear scaling for mood analysis.")
        return get_heuristic_mood(stress_level, anxiety_level)

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = f"""
        Act as a clinical psychology AI analyst. A user self-reported:
        - Stress level: {stress_level}/10
        - Anxiety level: {anxiety_level}/10

        Convert these self-reported scores into clinically-informed severity percentages (0-100%), reflecting the likelihood/severity of clinically significant stress and anxiety. Do not just multiply by 10 — account for typical psychometric non-linear scaling (e.g. scores of 7+ often indicate disproportionately higher clinical severity).

        Output strict valid JSON only with this exact schema:
        {{
          "stress_percentage": <number between 0 and 100>,
          "anxiety_percentage": <number between 0 and 100>,
          "insight": "<one short sentence interpreting the combined levels>"
        }}
        """
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        text = response.text.strip()

        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)
        return {
            "stress_percentage": round(float(data.get("stress_percentage", stress_level * 10)), 1),
            "anxiety_percentage": round(float(data.get("anxiety_percentage", anxiety_level * 10)), 1),
            "insight": data.get("insight", "Analysis completed by Gemini AI Core.")
        }
    except Exception as e:
        logger.warning(f"[Gemini Mood Analysis] {type(e).__name__}: {e}. Falling back to linear scaling.")
        return get_heuristic_mood(stress_level, anxiety_level)
