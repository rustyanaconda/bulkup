"""add meal_ingredients

Revision ID: 003
Revises: 002
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision      = '003'
down_revision = '002'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'meal_ingredients',
        sa.Column('id',          sa.Integer(), nullable=False),
        sa.Column('meal_id',     sa.Integer(), nullable=False),
        sa.Column('fdc_id',      sa.Integer(), nullable=False),
        sa.Column('description', sa.String(),  nullable=False),
        sa.Column('quantity',    sa.Float(),   nullable=False),
        sa.Column('unit',        sa.String(),  nullable=False),
        sa.Column('grams',       sa.Float(),   nullable=False),
        sa.Column('calories',    sa.Float(),   nullable=True),
        sa.Column('protein_g',   sa.Float(),   nullable=True),
        sa.Column('carbs_g',     sa.Float(),   nullable=True),
        sa.Column('fat_g',       sa.Float(),   nullable=True),
        sa.ForeignKeyConstraint(['meal_id'], ['meals.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_meal_ingredients_id', 'meal_ingredients', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_meal_ingredients_id', table_name='meal_ingredients')
    op.drop_table('meal_ingredients')
