"""add meal use tracking and meallog macro snapshots

Revision ID: 009
Revises: 008
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision      = '009'
down_revision = '008'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # Meal: use_count + last_used for "Your meals" sorting
    op.add_column('meals', sa.Column('use_count', sa.Integer(), nullable=False,
                                     server_default='0'))
    op.add_column('meals', sa.Column('last_used', sa.DateTime(), nullable=True))

    # MealLog: per-log macro snapshots so history is never rewritten by Meal edits
    op.add_column('meal_logs', sa.Column('protein_g_logged', sa.Float(), nullable=True))
    op.add_column('meal_logs', sa.Column('carbs_g_logged',   sa.Float(), nullable=True))
    op.add_column('meal_logs', sa.Column('fat_g_logged',     sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('meal_logs', 'fat_g_logged')
    op.drop_column('meal_logs', 'carbs_g_logged')
    op.drop_column('meal_logs', 'protein_g_logged')
    op.drop_column('meals', 'last_used')
    op.drop_column('meals', 'use_count')
