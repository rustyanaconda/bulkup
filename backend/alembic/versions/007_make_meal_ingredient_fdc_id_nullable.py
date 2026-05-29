"""make meal_ingredient fdc_id nullable

Revision ID: 007
Revises: 006
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision      = '007'
down_revision = '006'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.alter_column('meal_ingredients', 'fdc_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column('meal_ingredients', 'fdc_id', existing_type=sa.Integer(), nullable=False)
