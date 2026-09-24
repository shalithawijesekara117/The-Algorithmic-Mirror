from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Union
from datetime import datetime

# --- Auth Models ---
class UserRegister(BaseModel):
    name: str = Field(..., example="Alex Chen")
    email: str = Field(..., example="alex@example.com")
    password: str = Field(..., min_length=4, example="password123")
    age: int = Field(..., ge=10, le=100, example=20)
    gender: str = Field(..., example="Non-binary")

class UserLogin(BaseModel):
    email: str = Field(..., example="alex@example.com")
    password: str = Field(..., example="password123")

class UserAuthResponse(BaseModel):
    id: str
    name: str
    email: str
    age: int
    gender: str
    created_at: datetime
    onboarding_completed: bool = False

class UserProfileUpdate(BaseModel):
    email: str = Field(..., description="Email of the account being updated (not editable)")
    name: str = Field(..., min_length=1, example="Alex Chen")
    age: int = Field(..., ge=10, le=100, example=20)
    gender: str = Field(..., example="Non-binary")

class OnboardingSubmission(BaseModel):
    email: str = Field(..., description="Email of the account completing onboarding")
    age: int = Field(..., ge=10, le=100, example=20)
    gender: str = Field(..., example="Non-binary")
    bedtime: Optional[str] = Field(None, example="22:30")
    wake_time: Optional[str] = Field(None, example="07:00")
    avg_screen_time: float = Field(..., ge=0, le=16, example=4.5)
    avg_sleep_time: float = Field(..., ge=0, le=14, example=7.5)
    avg_social_activity_time: float = Field(2.0, ge=0, le=16, description="Average daily offline/in-person social activity hours", example=2.0)
    platform_hours: dict = Field(default_factory=dict, description="Per-platform average daily hours")

class MoodAnalysisRequest(BaseModel):
    stress_level: float = Field(..., ge=1, le=10, example=6.4)
    anxiety_level: float = Field(..., ge=1, le=10, example=5.8)

# --- Domain & Assessment Models ---
class UserBase(BaseModel):
    name: str = Field(..., example="Alex Chen")
    age: int = Field(..., ge=10, le=100, example=20)
    gender: str = Field(..., example="Non-binary")

class DigitalHabits(BaseModel):
    screen_time: float = Field(..., description="Daily screen time in hours", example=7.5)
    sleep_hours: float = Field(..., description="Average daily sleep hours", example=6.0)
    social_activity_hours: float = Field(..., description="Hours spent in social activities", example=2.0)
    social_media_platform: Union[str, List[str]] = Field(..., description="Selected social media platform(s)")

class MentalProfile(BaseModel):
    stress_level: float = Field(..., ge=1, le=10, description="Calculated stress level (1-10)", example=6.8)
    anxiety_level: float = Field(..., ge=1, le=10, description="Calculated anxiety level (1-10)", example=5.9)
    depression_level: float = Field(default=4.0, ge=1, le=10, description="Calculated depression level (1-10)", example=4.5)

class AssessmentSubmission(BaseModel):
    user_email: Optional[str] = None
    user: UserBase
    habits: DigitalHabits
    mental_profile: MentalProfile

class Recommendation(BaseModel):
    risk_category: str = Field(..., description="Risk category: Low, Medium, or High", example="Medium")
    risk_score: float = Field(..., description="Overall calculated risk percentage (0-100)", example=65.0)
    summary: str = Field(..., description="AI summary of behavioral patterns")
    recommendation_advice: List[str] = Field(..., description="Actionable personalized advice points")

class FullAssessmentRecord(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_email: Optional[str] = None
    user: UserBase
    habits: DigitalHabits
    mental_profile: MentalProfile
    recommendation: Recommendation
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

# --- Counseling Models ---
class Counselor(BaseModel):
    id: str
    name: str
    title: str
    specialization: str
    rating: float
    reviews_count: int
    avatar_url: str
    bio: str
    available_days: List[str]
    signature_advice: str = Field(default="", description="A short piece of go-to advice this counselor gives clients")

class CounselingBooking(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_email: str
    counselor_id: str
    counselor_name: str
    session_date: str
    session_time: str
    topic: str
    notes: Optional[str] = ""
    status: str = "Confirmed"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class CounselingChatMessage(BaseModel):
    sender: str
    message: str

class CounselingChatRequest(BaseModel):
    user_email: Optional[str] = None
    message: str
    history: List[CounselingChatMessage] = []
