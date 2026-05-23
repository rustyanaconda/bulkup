"""
Database models — SQLAlchemy ORM.

If you know SQL, these will feel very familiar.
Each class = one table. Each Column = one column.
SQLAlchemy handles writing the actual SQL for you.

SQL equivalent of User:
    CREATE TABLE users (
        id         SERIAL PRIMARY KEY,
        email      VARCHAR UNIQUE NOT NULL,
        weight_lbs FLOAT,
        ...
    );
"""
from sqlalchemy import Column, Integer, String, Float, Date, Enum, ForeignKey, DateTime, Table
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()


class MealState(str, enum.Enum):
    upcoming = "upcoming"
    done     = "done"
    skipped  = "skipped"
    missed   = "missed"


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    name          = Column(String)
    weight_lbs = Column(Float)
    height_in  = Column(Float)
    age        = Column(Integer)
    sex        = Column(String)               # 'male' or 'female'
    activity   = Column(Float, default=1.55)  # activity multiplier
    surplus    = Column(Integer, default=500) # kcal surplus target
    goal_lbs   = Column(Float)               # e.g. 180

    # Whoop OAuth tokens — stored per user, refreshed automatically
    whoop_access_token  = Column(String, nullable=True)
    whoop_refresh_token = Column(String, nullable=True)

    meals     = relationship("Meal",     back_populates="user")
    meal_logs = relationship("MealLog",  back_populates="user")


# Many-to-many join table — no model class needed, just a table object
meal_tags = Table(
    "meal_tags",
    Base.metadata,
    Column("meal_id", Integer, ForeignKey("meals.id"), primary_key=True),
    Column("tag_id",  Integer, ForeignKey("tags.id"),  primary_key=True),
)


class Meal(Base):
    """
    A meal template — like a recipe card, reused across days.
    """
    __tablename__ = "meals"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    name        = Column(String, nullable=False)
    calories    = Column(Integer)
    protein_g   = Column(Float)
    carbs_g     = Column(Float)
    fat_g       = Column(Float)
    meal_time   = Column(String)   # 'breakfast','lunch','dinner','snack'
    ingredients = Column(String)   # comma-separated; upgrade to JSON later
    is_smoothie = Column(Integer, default=0)
    is_treat    = Column(Integer, default=0)

    user             = relationship("User", back_populates="meals")
    logs             = relationship("MealLog", back_populates="meal")
    tags             = relationship("Tag", secondary=meal_tags, back_populates="meals")
    ingredients_list = relationship("MealIngredient", back_populates="meal",
                                    cascade="all, delete-orphan")


class MealLog(Base):
    """
    A specific meal on a specific day.
    This is what gets marked done/skipped/missed.
    One row per meal per day per user.

    SQL equivalent:
        SELECT * FROM meal_logs
        WHERE user_id = 1 AND date = '2026-05-06';
    """
    __tablename__ = "meal_logs"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"))
    meal_id         = Column(Integer, ForeignKey("meals.id"))
    date            = Column(Date, nullable=False)
    state           = Column(Enum(MealState), default=MealState.upcoming)
    calories_logged = Column(Integer, nullable=True)  # actual kcal if adjusted

    user = relationship("User", back_populates="meal_logs")
    meal = relationship("Meal", back_populates="logs")


class DailyCalories(Base):
    """
    One row per user per day — the full calorie picture.
    burned_kcal comes from Whoop (or is None if not connected).
    """
    __tablename__ = "daily_calories"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    date        = Column(Date, nullable=False)
    burned_kcal = Column(Integer, nullable=True)   # from Whoop API
    target_kcal = Column(Integer)                  # TDEE + surplus
    eaten_kcal  = Column(Integer, default=0)       # sum of done meals
    source      = Column(String, default="manual") # 'manual','whoop','oura'
    created_at  = Column(DateTime, default=datetime.utcnow)


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id          = Column(Integer, primary_key=True, index=True)
    meal_id     = Column(Integer, ForeignKey("meals.id"), nullable=False)
    fdc_id      = Column(Integer, nullable=False)
    description = Column(String,  nullable=False)
    quantity    = Column(Float,   nullable=False)
    unit        = Column(String,  nullable=False)
    grams       = Column(Float,   nullable=False)
    calories    = Column(Float,   nullable=True)
    protein_g   = Column(Float,   nullable=True)
    carbs_g     = Column(Float,   nullable=True)
    fat_g       = Column(Float,   nullable=True)

    meal = relationship("Meal", back_populates="ingredients_list")


class Tag(Base):
    __tablename__ = "tags"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String,  unique=True, nullable=False)  # e.g. "high protein"
    slug     = Column(String,  unique=True, nullable=False)  # e.g. "high-protein"
    tag_type = Column(String,  nullable=False)               # 'primary','restriction','secondary'

    meals = relationship("Meal", secondary=meal_tags, back_populates="tags")
