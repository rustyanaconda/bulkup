"""
Seed starter tags into the database.
Safe to run multiple times — checks by slug before inserting.

Usage:
    cd backend
    source venv/bin/activate
    python seed_tags.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import get_db
from models.models import Tag

# (name, tag_type)
TAGS = [
    # Primary — shown prominently on meal cards
    ("high protein",     "primary"),
    ("low carb",         "primary"),
    ("vegan",            "primary"),
    ("vegetarian",       "primary"),
    ("quick",            "primary"),
    ("budget friendly",  "primary"),
    ("organic",          "primary"),
    ("plastic free",     "primary"),

    # Restriction — safety / allergy related
    ("gluten-free",      "restriction"),
    ("dairy-free",       "restriction"),
    ("nut-free",         "restriction"),
    ("soy-free",         "restriction"),
    ("egg-free",         "restriction"),

    # Allergen — marks what an ingredient CONTAINS (for allergy safety)
    ("contains egg",      "allergen"),
    ("contains dairy",    "allergen"),
    ("contains gluten",   "allergen"),
    ("contains nuts",     "allergen"),
    ("contains peanuts",  "allergen"),
    ("contains soy",      "allergen"),
    ("contains shellfish","allergen"),
    ("contains fish",     "allergen"),

    # Secondary — hidden, used for filtering/matching only
    ("savory",           "secondary"),
    ("sweet",            "secondary"),
    ("spicy",            "secondary"),
    ("one-pan",          "secondary"),
    ("no-cook",          "secondary"),
    ("meal prep",        "secondary"),
    ("freezer-friendly", "secondary"),
    ("post-workout",     "secondary"),
    ("whole food",       "secondary"),
    ("no seed oils",     "secondary"),
    ("grass-fed",        "secondary"),
    ("wild-caught",      "secondary"),
]


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-")


def seed() -> None:
    db = next(get_db())
    try:
        added = 0
        for name, tag_type in TAGS:
            slug = slugify(name)
            if not db.query(Tag).filter(Tag.slug == slug).first():
                db.add(Tag(name=name, slug=slug, tag_type=tag_type))
                added += 1

        db.commit()
        print(f"Done — {added} tag(s) inserted, {len(TAGS) - added} already existed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
