from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
# Trigger reload for updated models
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager
import hashlib
import os

from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.models import (
    UserRegister,
    UserLogin,
    UserAuthResponse,
    UserProfileUpdate,
    OnboardingSubmission,
    MoodAnalysisRequest,
    AssessmentSubmission,
    FullAssessmentRecord,
    Recommendation,
    Counselor,
    CounselingBooking,
    CounselingChatRequest,
    CounselingChatMessage,
)
from app.services.gemini_service import (
    evaluate_mental_health_risk,
    analyze_mood_percentages,
    ADVICE_MODEL_TIERS,
)


# =========================================================
# Password Hashing
# =========================================================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# =========================================================
# Application Lifespan
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


# =========================================================
# FastAPI Application
# =========================================================

app = FastAPI(
    title="The Algorithmic Mirror API",
    description="AI-Driven Framework Exploring Mental Health, Digital Habits, and Counseling for Gen Z",
    version="2.1.0",
    lifespan=lifespan,
)


# =========================================================
# CORS Configuration
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# System Endpoints
# =========================================================

@app.get("/", tags=["System"])
async def root():
    return {
        "title": "The Algorithmic Mirror API",
        "status": "Operational",
        "database": "MongoDB",
        "docs_url": "/docs",
    }


@app.get("/api/health", tags=["System"])
async def health_check():
    db = get_database()
    db_connected = False

    if db is not None:
        try:
            await db.command("ping")
            db_connected = True
        except Exception:
            db_connected = False

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "mongodb_connected": db_connected,
    }


# =========================================================
# Authentication Endpoints
# =========================================================

@app.post(
    "/api/auth/register",
    response_model=UserAuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def register_user(user_in: UserRegister):

    db = get_database()
    email_clean = user_in.email.strip().lower()

    # Check whether the email already exists
    if db is not None:
        existing = await db["users"].find_one(
            {"email": email_clean}
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists.",
            )

    # Create user document
    user_doc = {
        "name": user_in.name,
        "email": email_clean,
        "password_hash": hash_password(user_in.password),
        "age": user_in.age,
        "gender": user_in.gender,
        "onboarding_completed": False,
        "created_at": datetime.utcnow(),
    }

    record_id = "user_" + str(
        int(datetime.utcnow().timestamp())
    )

    # Save user to MongoDB
    if db is not None:
        try:
            res = await db["users"].insert_one(user_doc)
            record_id = str(res.inserted_id)
        except Exception as e:
            print(f"MongoDB User Insert Warning: {e}")

    return {
        "id": record_id,
        "name": user_in.name,
        "email": email_clean,
        "age": user_in.age,
        "gender": user_in.gender,
        "created_at": user_doc["created_at"],
        "onboarding_completed": False,
    }


@app.post(
    "/api/auth/login",
    response_model=UserAuthResponse,
    tags=["Auth"],
)
async def login_user(credentials: UserLogin):

    db = get_database()
    email_clean = credentials.email.strip().lower()
    pwd_hash = hash_password(credentials.password)

    # Demo login if MongoDB is unavailable
    if db is None:
        return {
            "id": "demo_id",
            "name": email_clean.split("@")[0].capitalize(),
            "email": email_clean,
            "age": 21,
            "gender": "Non-binary",
            "created_at": datetime.utcnow(),
            "onboarding_completed": False,
        }

    # Find matching user
    user = await db["users"].find_one(
        {
            "email": email_clean,
            "password_hash": pwd_hash,
        }
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "age": user["age"],
        "gender": user["gender"],
        "created_at": user.get(
            "created_at",
            datetime.utcnow(),
        ),
        "onboarding_completed": user.get(
            "onboarding_completed",
            False,
        ),
    }


@app.post(
    "/api/auth/onboarding",
    response_model=UserAuthResponse,
    tags=["Auth"],
)
async def complete_onboarding(
    submission: OnboardingSubmission,
):
    """Save onboarding data and mark onboarding as complete."""

    db = get_database()
    email_clean = submission.email.strip().lower()

    # Prepare onboarding data
    onboarding_fields = {
        "age": submission.age,
        "gender": submission.gender,
        "avg_screen_time": submission.avg_screen_time,
        "avg_sleep_time": submission.avg_sleep_time,
        "avg_social_activity_time": submission.avg_social_activity_time,
        "platform_hours": submission.platform_hours,
        "onboarding_completed": True,
    }

    if submission.bedtime:
        onboarding_fields["bedtime"] = submission.bedtime

    if submission.wake_time:
        onboarding_fields["wake_time"] = submission.wake_time

    # Demo response if MongoDB is unavailable
    if db is None:
        return {
            "id": "demo_id",
            "name": email_clean.split("@")[0].capitalize(),
            "email": email_clean,
            "age": submission.age,
            "gender": submission.gender,
            "created_at": datetime.utcnow(),
            "onboarding_completed": True,
        }

    # Find existing account
    existing = await db["users"].find_one(
        {"email": email_clean}
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Account not found.",
        )

    # Update onboarding data
    await db["users"].update_one(
        {"email": email_clean},
        {"$set": onboarding_fields},
    )

    return {
        "id": str(existing["_id"]),
        "name": existing["name"],
        "email": email_clean,
        "age": submission.age,
        "gender": submission.gender,
        "created_at": existing.get(
            "created_at",
            datetime.utcnow(),
        ),
        "onboarding_completed": True,
    }


@app.put(
    "/api/auth/profile",
    response_model=UserAuthResponse,
    tags=["Auth"],
)
async def update_profile(update: UserProfileUpdate):
    """Update user profile information."""

    db = get_database()
    email_clean = update.email.strip().lower()

    # Demo response if MongoDB is unavailable
    if db is None:
        return {
            "id": "demo_id",
            "name": update.name,
            "email": email_clean,
            "age": update.age,
            "gender": update.gender,
            "created_at": datetime.utcnow(),
        }

    # Find existing account
    existing = await db["users"].find_one(
        {"email": email_clean}
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Account not found.",
        )

    # Update profile
    await db["users"].update_one(
        {"email": email_clean},
        {
            "$set": {
                "name": update.name,
                "age": update.age,
                "gender": update.gender,
            }
        },
    )

    return {
        "id": str(existing["_id"]),
        "name": update.name,
        "email": email_clean,
        "age": update.age,
        "gender": update.gender,
        "created_at": existing.get(
            "created_at",
            datetime.utcnow(),
        ),
        "onboarding_completed": existing.get(
            "onboarding_completed",
            False,
        ),
    }


# =========================================================
# Assessment Endpoints
# =========================================================

# In-memory storage cache for resilient fallback
IN_MEMORY_ASSESSMENTS = []


@app.post(
    "/api/assessments",
    response_model=FullAssessmentRecord,
    status_code=status.HTTP_201_CREATED,
    tags=["Assessment"],
)
async def create_assessment(
    submission: AssessmentSubmission,
):

    # Generate AI mental health risk recommendation according to tier model
    recommendation = await evaluate_mental_health_risk(
        user=submission.user,
        habits=submission.habits,
        mental=submission.mental_profile,
    )

    # Prepare database document
    doc = {
        "user_email": submission.user_email,
        "user": submission.user.model_dump(),
        "habits": submission.habits.model_dump(),
        "mental_profile": submission.mental_profile.model_dump(),
        "recommendation": recommendation.model_dump(),
        "created_at": datetime.utcnow(),
    }

    db = get_database()

    record_id = "rec_" + str(
        int(datetime.utcnow().timestamp())
    )

    # Save assessment to MongoDB
    if db is not None:
        try:
            result = await db["assessments"].insert_one(doc)
            record_id = str(result.inserted_id)
        except Exception as e:
            print(f"MongoDB Insert Warning: {e}")

    doc["_id"] = record_id
    
    # Store in backend in-memory cache as well
    IN_MEMORY_ASSESSMENTS.insert(0, dict(doc))

    return doc


@app.get(
    "/api/assessments",
    response_model=List[FullAssessmentRecord],
    tags=["Assessment"],
)
async def list_assessments(
    user_email: Optional[str] = None,
    limit: int = 20,
):

    db = get_database()

    if db is None:
        # Fallback to backend in-memory storage
        results = IN_MEMORY_ASSESSMENTS
        if user_email:
            clean_email = user_email.strip().lower()
            results = [r for r in results if (r.get("user_email") or "").strip().lower() == clean_email]
        return results[:limit]

    try:
        query = {}

        if user_email:
            query["user_email"] = (
                user_email.strip().lower()
            )

        # Get latest assessments first
        cursor = (
            db["assessments"]
            .find(query)
            .sort("created_at", -1)
            .limit(limit)
        )

        results = []

        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch records: {str(e)}",
        )


@app.get(
    "/api/advice-model",
    tags=["Assessment"],
)
async def get_advice_model():
    """Retrieve the tier-based advice model stored in backend."""
    return ADVICE_MODEL_TIERS


# =========================================================
# Counseling Module
# =========================================================

SAMPLE_COUNSELORS = [
    {
        "id": "c1",
        "name": "Dr. Maya Senanayake, PsyD",
        "title": "Digital Wellness & Screen Addiction Specialist",
        "specialization": "Digital Detox & Social Anxiety",
        "rating": 4.9,
        "reviews_count": 128,
        "avatar_url": "👩‍⚕️",
        "bio": "10+ years helping Sri Lankan youth navigate social media fatigue, doomscrolling, and cognitive boundary setting.",
        "available_days": ["Mon", "Wed", "Fri", "Sat"],
        "signature_advice": "Set a hard 'phone parking' spot outside your bedroom — most doomscrolling happens in the first and last 20 minutes of the day.",
    },
    {
        "id": "c2",
        "name": "Dr. Kanishka Perera, MBBS, MD (Psychiatry)",
        "title": "Cognitive Behavioral & Sleep Therapist",
        "specialization": "Sleep Recovery & Exam Burnout",
        "rating": 4.85,
        "reviews_count": 94,
        "avatar_url": "👨‍⚕️",
        "bio": "Specializes in circadian sleep restoration, exam burnout reduction, and stress management for Sri Lankan students.",
        "available_days": ["Tue", "Thu", "Sat", "Sun"],
        "signature_advice": "Anchor your wake-up time, not your bedtime — a consistent morning alarm resets your circadian rhythm faster than an earlier bedtime alone.",
    },
    {
        "id": "c3",
        "name": "Ananya Jayasinghe, MSc, MSW",
        "title": "Youth Academic & Mindfulness Counselor",
        "specialization": "Academic Stress & Focus",
        "rating": 4.95,
        "reviews_count": 156,
        "avatar_url": "🧑‍⚕️",
        "bio": "Focuses on mindfulness meditation, study focus preservation for A/L & university students, and reducing comparison anxiety.",
        "available_days": ["Mon", "Tue", "Thu", "Fri"],
        "signature_advice": "Before comparing your life to social feeds, remember you're comparing your everyday behind-the-scenes to someone else's highlight reel.",
    },
]


@app.get(
    "/api/counselors",
    response_model=List[Counselor],
    tags=["Counseling"],
)
async def get_counselors():
    """Retrieve counseling professionals."""

    return SAMPLE_COUNSELORS


@app.post(
    "/api/counseling/book",
    response_model=CounselingBooking,
    status_code=status.HTTP_201_CREATED,
    tags=["Counseling"],
)
async def book_counseling_session(
    booking: CounselingBooking,
):
    # Do not save to counseling_sessions collection in database
    doc = booking.model_dump(exclude={"id"})
    doc["created_at"] = datetime.utcnow()
    doc["_id"] = "book_" + str(int(datetime.utcnow().timestamp()))
    return doc


@app.get(
    "/api/counseling/sessions",
    response_model=List[CounselingBooking],
    tags=["Counseling"],
)
async def get_user_counseling_sessions(
    user_email: str,
):
    # No counseling_sessions collection in database
    return []


# =========================================================
# AI COUNSELING CHATBOT
# =========================================================

@app.post(
    "/api/counseling/chat",
    tags=["Counseling"],
)
async def ai_counseling_chat(
    req: CounselingChatRequest,
):
    """
    MindCare Companion chatbot for The Algorithmic Mirror.
    Provides guidance in simple English with bullet-point advice
    strictly for project-related topics (digital habits, screen time,
    social media, sleep, stress, anxiety, and mental wellness).
    Refuses off-topic questions clearly.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    user_msg = req.message.strip()

    if not user_msg:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty",
        )

    msg_lower = user_msg.lower()

    OFF_TOPIC_REPLY = (
        "This question is not related to The Algorithmic Mirror project. "
        "I can only assist you with topics such as digital habits, screen time, "
        "social media use, sleep, stress, anxiety, and mental wellbeing."
    )

    SRI_LANKA_CRISIS_REPLY = (
        "Please know that you are not alone and kind, confidential support is available right now in Sri Lanka. "
        "If you are feeling overwhelmed, hopeless, or going through a difficult time, please reach out immediately:\n\n"
        "* 1926 (NIMH National Mental Health Helpline) - Toll-free, 24/7 confidential support across Sri Lanka.\n\n"
        "* 1333 (CCCline) - Toll-free, 24/7 crisis and emotional support helpline in Sri Lanka.\n\n"
        "* 011 269 6000 / 011 269 2709 (Sri Lanka Sumithrayo) - Free, confidential emotional support.\n\n"
        "* 1990 (Suwa Seriya) - Free 24/7 national emergency ambulance service in Sri Lanka.\n\n"
        "Please reach out to one of these services or speak with a family member, teacher, or counselor. Your life and wellbeing matter deeply."
    )

    def localize_helplines_for_sri_lanka(text: str) -> str:
        """
        Ensures any generic or foreign mental health helplines (e.g. US 988, UK 111, Samaritans UK)
        are replaced with verified Sri Lankan emergency & crisis helplines.
        """
        if not text:
            return text
        foreign_triggers = [
            "988", "suicide & crisis lifeline", "in the us and canada", "in the us",
            "in the uk", "nhs", "116 123", "samaritans", "findahelpline"
        ]
        text_lower = text.lower()
        if any(trigger in text_lower for trigger in foreign_triggers):
            return SRI_LANKA_CRISIS_REPLY
        return text

    async def save_user_chat_messages(user_email: str, user_msg: str, reply: str):
        """
        Saves user and AI chat messages under a single document and single ID
        per user_email in the chat_messages collection using MongoDB $push.
        """
        if not user_email:
            return
        db = get_database()
        if db is None:
            return
        try:
            email_clean = user_email.strip().lower()
            now = datetime.utcnow()
            new_entries = [
                {
                    "sender": "user",
                    "message": user_msg,
                    "created_at": now,
                },
                {
                    "sender": "ai",
                    "message": reply,
                    "created_at": now,
                },
            ]
            await db["chat_messages"].update_one(
                {"user_email": email_clean},
                {
                    "$push": {"messages": {"$each": new_entries}},
                    "$set": {"updated_at": now},
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
        except Exception as e:
            print(f"MongoDB Chat Save Warning: {e}")

    # 1. Detect direct crisis / self-harm triggers immediately
    crisis_triggers = [
        "suicide", "kill myself", "end my life", "want to die", "dying", "self harm",
        "hurt myself", "take my life", "end it all", "no reason to live", "feel like dying"
    ]
    if any(trigger in msg_lower for trigger in crisis_triggers):
        reply = SRI_LANKA_CRISIS_REPLY
        await save_user_chat_messages(req.user_email, user_msg, reply)
        return {"reply": reply}

    # 2. Detect simple greetings directly
    greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "ayubowan", "kohomada", "greetings"]
    is_pure_greeting = msg_lower in greetings or any(msg_lower.startswith(g + " ") or msg_lower.startswith(g + "!") or msg_lower.startswith(g + ",") for g in greetings)

    if is_pure_greeting and len(user_msg.split()) <= 4:
        greeting_reply = (
            "Ayubowan! Hello! I am MindCare Companion, your AI counselor for The Algorithmic Mirror. "
            "How can I help you today with your screen time, social media habits, sleep, or study stress?"
        )
        await save_user_chat_messages(req.user_email, user_msg, greeting_reply)
        return {"reply": greeting_reply}

    # 3. Keywords and topic analysis
    project_keywords = [
        "algorithmic mirror", "digital wellbeing", "digital wellness", "digital habits",
        "screen time", "screen usage", "screen use", "screens", "social media",
        "tiktok", "instagram", "facebook", "youtube", "whatsapp", "twitter",
        "phone", "mobile", "smartphone", "device", "internet", "online",
        "sleep", "sleeping", "insomnia", "bedtime", "night", "rest", "tired",
        "stress", "stressed", "anxiety", "anxious", "nervous", "panic", "worry",
        "depression", "depressed", "mental health", "mental wellbeing", "wellbeing",
        "well-being", "mood", "burnout", "digital fatigue", "fatigue", "doomscrolling",
        "scrolling", "scroll", "reels", "feed", "notifications", "focus", "concentrate",
        "concentration", "study", "studying", "exam", "addiction", "detox", "counseling",
        "counselling", "mindfulness", "coping", "relax", "breathe", "breathing",
        "balance", "habits", "offline", "routine", "advice", "help", "tips"
    ]

    off_topic_triggers = [
        "python", "javascript", "java", "c++", "html", "css", "sql", "coding", "programming",
        "algorithm problem", "binary search", "leetcode", "write code", "function",
        "math", "calculate", "derivative", "integral", "physics", "chemistry",
        "football", "cricket", "fifa", "ipl", "match score", "world cup",
        "politics", "election", "president", "prime minister", "parliament",
        "recipe", "how to cook", "bake cake", "ingredient",
        "bitcoin", "crypto", "stock market", "weather forecast"
    ]

    is_obviously_off_topic = any(trigger in msg_lower for trigger in off_topic_triggers)
    matches_project_keywords = any(kw in msg_lower for kw in project_keywords)

    if is_obviously_off_topic and not matches_project_keywords:
        return {"reply": OFF_TOPIC_REPLY}

    reply = None

    # 4. Try Gemini AI with candidate models and Sri Lanka localized system prompt
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            from google import genai
            client = genai.Client(api_key=api_key)

            candidate_models = [
                os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
                "gemini-3.5-flash-lite",
                "gemini-3.5-flash",
                "gemini-flash-lite-latest",
                "gemini-3.6-flash",
            ]

            prompt = f"""
You are 'MindCare Companion', the AI wellness counselor for 'The Algorithmic Mirror' project.
The Algorithmic Mirror is a digital wellbeing platform designed specifically for young adults, university students, and youth in SRI LANKA.
It tracks and improves digital habits, screen time, social media usage (TikTok, Instagram, YouTube, WhatsApp, Facebook), sleep hygiene, stress, anxiety, doomscrolling, exam stress, and mental balance.

SRI LANKA CONTEXT & LOCALIZATION RULES:
1. Target Audience: You are assisting Sri Lankan users (youth, university students, A/L students, and young adults living in Sri Lanka).
2. Local Context & Advice: Tailor your guidance, examples, and advice to daily life in Sri Lanka (e.g., managing study pressure, university/A/L exam stress, tuition schedules, balancing WhatsApp and social media, spending screen-free time outdoors in local environments, engaging with family and friends).
3. Helplines & Mental Health Resources (CRITICAL):
   - Whenever mentioning counseling, mental health hotlines, crisis support, or professional assistance, you must ONLY provide official Sri Lankan resources:
     * 1926 - National Mental Health Helpline (NIMH Sri Lanka, toll-free 24/7)
     * 1333 - CCCline (toll-free 24/7 crisis and emotional support)
     * 011 269 6000 / 011 269 2709 - Sri Lanka Sumithrayo (confidential emotional support)
     * 1990 - Suwa Seriya (free 24/7 national emergency ambulance)
   - NEVER provide US (988), UK (111, Samaritans), Canadian, or foreign emergency numbers, as they do not work in Sri Lanka.

STRICT PROJECT SCOPE RULE:
1. You must ONLY answer questions directly related to The Algorithmic Mirror project topics:
   - Digital habits, phone and screen time usage
   - Social media use, doomscrolling, app notifications
   - Sleep schedule, nighttime screen use, insomnia, sleep quality
   - Stress, anxiety, burnout, study focus, concentration, and mental wellbeing
   - Digital detox, healthy offline routines, and coping strategies
   - Emotional support and mental health helplines for Sri Lankan youth
2. If the user's question is NOT related to these topics (e.g. coding, programming, mathematics, sports scores, politics, cooking recipes, general knowledge), you MUST decline and answer with this exact response:
   "This question is not related to The Algorithmic Mirror project. I can only assist you with topics such as digital habits, screen time, social media use, sleep, stress, anxiety, and mental wellbeing."
3. If the user greets you, reply warmly in simple English and invite them to ask about their digital habits, sleep, or stress.

LANGUAGE & FORMATTING RULES:
- Language: Use simple, clear, supportive English (keeping the current English language style exactly as is).
- Whenever you give advice, action steps, tips, or recommendations, ALWAYS format them as bullet points (starting with * or •).
- Leave an empty line between each bullet point so they are clearly spaced, distinct, and easy to read.
- Use normal, simple sentences for short opening and closing statements.
- Keep the response supportive, practical, culturally empathetic, and easy to follow.
- Do not diagnose medical conditions.

User Question:
"{user_msg}"
"""

            # Iterate through candidate models if one is rate-limited (429) or unavailable (503)
            for model_name in candidate_models:
                try:
                    res = await client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    if res and res.text:
                        reply = res.text.strip()
                        reply = localize_helplines_for_sri_lanka(reply)
                        break
                except Exception as model_err:
                    print(f"[Gemini Chat] Model {model_name} failed: {type(model_err).__name__}. Trying next model.")
                    continue

        except Exception as e:
            print(f"[Gemini Chat ERROR] {type(e).__name__}: {e}. Falling back to local engine.")

    # 5. Local Intelligent Fallback Engine (runs if Gemini is offline/exhausted)
    if reply is None:
        if not matches_project_keywords:
            reply = OFF_TOPIC_REPLY
        elif "sleep" in msg_lower or "night" in msg_lower or "insomnia" in msg_lower or "tired" in msg_lower or "rest" in msg_lower:
            reply = (
                "Good sleep is very important for your energy, studies, and emotional balance. "
                "Here are practical steps to help you sleep better:\n\n"
                "* Put your phone away 30 to 60 minutes before going to bed.\n\n"
                "* Avoid scrolling social media in the dark, as blue light delays your body's natural sleep cycle.\n\n"
                "* Aim for 7 to 8 hours of regular sleep every night.\n\n"
                "* Try a relaxing offline habit before bed, like reading a book or listening to calm music.\n\n"
                "* Keep your bedroom as dark, quiet, and cool as possible."
            )
        elif "screen" in msg_lower or "tiktok" in msg_lower or "instagram" in msg_lower or "social media" in msg_lower or "scroll" in msg_lower or "phone" in msg_lower or "doomscroll" in msg_lower:
            reply = (
                "High screen time and continuous doomscrolling can leave you feeling mentally exhausted and restless. "
                "Here are practical steps to reduce your screen time:\n\n"
                "* Set a daily time limit of 30 to 60 minutes for social media apps like TikTok, Instagram, and WhatsApp.\n\n"
                "* Turn off non-essential notifications so your phone does not distract you while studying or relaxing.\n\n"
                "* Take a 5 to 10 minute break after every 30 to 45 minutes of screen use.\n\n"
                "* Replace 30 minutes of scrolling with an outdoor walk, exercise, or spending time with family and friends.\n\n"
                "* Keep your morning screen-free for the first 20 minutes after waking up."
            )
        elif "stress" in msg_lower or "anxi" in msg_lower or "panic" in msg_lower or "worry" in msg_lower or "depress" in msg_lower or "overwhelm" in msg_lower:
            reply = (
                "It is completely normal to feel stressed or anxious when daily routines, studies, or digital habits become overwhelming. "
                "Here are simple techniques to help you feel calm and grounded:\n\n"
                "* Take slow, deep breaths (inhale for 4 seconds, hold for 4, and exhale for 4).\n\n"
                "* Step away from your phone and take a short walk outdoors or drink a cup of water or warm tea.\n\n"
                "* Write down the things causing you worry on a piece of paper to clear your mind.\n\n"
                "* Try the Zen Relief breathing exercise on our platform dashboard.\n\n"
                "* If you feel deeply overwhelmed or need someone to listen, you can call 1926 (NIMH National Mental Health Helpline) or 1333 (CCCline) toll-free anytime in Sri Lanka."
            )
        elif "focus" in msg_lower or "concentrat" in msg_lower or "study" in msg_lower or "exam" in msg_lower or "burnout" in msg_lower:
            reply = (
                "Constant notifications make it challenging to maintain deep focus for exam preparation and coursework. "
                "Here are effective ways to improve your study focus:\n\n"
                "* Study in focused 25-minute sessions followed by a 5-minute screen-free break (Pomodoro method).\n\n"
                "* Keep your phone on silent and place it in another room or away from your study desk.\n\n"
                "* Focus on one topic or subject at a time instead of multitasking between apps.\n\n"
                "* Drink plenty of water and maintain a consistent sleep schedule to keep your mind sharp."
            )
        elif "detox" in msg_lower or "habit" in msg_lower or "routine" in msg_lower:
            reply = (
                "A digital detox helps refresh your mind and build healthier daily routines in Sri Lanka. "
                "Here are simple steps you can take:\n\n"
                "* Schedule at least 1 to 2 hours of screen-free time each day.\n\n"
                "* Spend time outdoors or engage in physical sports and creative hobbies.\n\n"
                "* Eat your meals with family or friends without looking at your phone or watching videos.\n\n"
                "* Monitor your daily progress using The Algorithmic Mirror dashboard."
            )
        else:
            reply = (
                "Welcome to The Algorithmic Mirror. Here are simple steps to help you maintain digital balance and mental wellness:\n\n"
                "* Balance your screen time with offline activities, sports, and hobbies.\n\n"
                "* Maintain a regular 7 to 8 hour sleep schedule every night.\n\n"
                "* Take regular breaks from social media apps throughout the day.\n\n"
                "* Practice mindful breathing or relaxation whenever you feel overwhelmed.\n\n"
                "* For free, confidential emotional support in Sri Lanka, you can reach 1926 (NIMH) or 1333 (CCCline) toll-free."
            )

    # 5. Save chat history under single document / ID per user_email
    await save_user_chat_messages(req.user_email, user_msg, reply)
    return {"reply": reply}


# =========================================================
# Chat History Endpoint
# =========================================================

@app.get(
    "/api/counseling/chat/history",
    tags=["Counseling"],
)
async def get_chat_history(
    user_email: str,
    limit: int = 100,
):
    """Fetch saved AI MindCare Companion chat history."""
    db = get_database()
    if db is None:
        return []

    try:
        email_clean = user_email.strip().lower()
        doc = await db["chat_messages"].find_one({"user_email": email_clean})
        if not doc:
            return []

        # Return messages array from the user's single document
        if "messages" in doc and isinstance(doc["messages"], list):
            msgs = doc["messages"][-limit:] if limit else doc["messages"]
            return [
                {
                    "sender": m.get("sender", "ai"),
                    "message": m.get("message", ""),
                }
                for m in msgs
            ]

        if "message" in doc:
            return [{"sender": doc.get("sender", "ai"), "message": doc.get("message", "")}]

        return []

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch chat history: {str(e)}",
        )


# =========================================================
# Mood Analysis Endpoint
# =========================================================

@app.post(
    "/api/analyze-mood",
    tags=["Assessment"],
)
async def analyze_mood(
    payload: MoodAnalysisRequest,
):
    """
    Convert stress and anxiety self-reports
    into severity percentages.
    """

    result = await analyze_mood_percentages(
        payload.stress_level,
        payload.anxiety_level,
    )

    return result