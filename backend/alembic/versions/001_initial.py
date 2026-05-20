"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id',            sa.Integer(),            nullable=False),
        sa.Column('email',         sa.String(),             nullable=False),
        sa.Column('password_hash', sa.String(),             nullable=True),
        sa.Column('name',          sa.String(),             nullable=True),
        sa.Column('weight_lbs',    sa.Float(),              nullable=True),
        sa.Column('height_in',     sa.Float(),              nullable=True),
        sa.Column('age',           sa.Integer(),            nullable=True),
        sa.Column('sex',           sa.String(),             nullable=True),
        sa.Column('activity',      sa.Float(),              nullable=True),
        sa.Column('surplus',       sa.Integer(),            nullable=True),
        sa.Column('goal_lbs',      sa.Float(),              nullable=True),
        sa.Column('whoop_access_token',  sa.String(),       nullable=True),
        sa.Column('whoop_refresh_token', sa.String(),       nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id',    'users', ['id'],    unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'meals',
        sa.Column('id',          sa.Integer(), nullable=False),
        sa.Column('user_id',     sa.Integer(), nullable=True),
        sa.Column('name',        sa.String(),  nullable=False),
        sa.Column('calories',    sa.Integer(), nullable=True),
        sa.Column('protein_g',   sa.Float(),   nullable=True),
        sa.Column('carbs_g',     sa.Float(),   nullable=True),
        sa.Column('fat_g',       sa.Float(),   nullable=True),
        sa.Column('meal_time',   sa.String(),  nullable=True),
        sa.Column('ingredients', sa.String(),  nullable=True),
        sa.Column('is_smoothie', sa.Integer(), nullable=True),
        sa.Column('is_treat',    sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_meals_id', 'meals', ['id'], unique=False)

    op.create_table(
        'meal_logs',
        sa.Column('id',              sa.Integer(), nullable=False),
        sa.Column('user_id',         sa.Integer(), nullable=True),
        sa.Column('meal_id',         sa.Integer(), nullable=True),
        sa.Column('date',            sa.Date(),    nullable=False),
        sa.Column('state',           sa.Enum('upcoming', 'done', 'skipped', 'missed',
                                             name='mealstate'),
                                     nullable=True),
        sa.Column('calories_logged', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['meal_id'], ['meals.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_meal_logs_id', 'meal_logs', ['id'], unique=False)

    op.create_table(
        'daily_calories',
        sa.Column('id',          sa.Integer(),  nullable=False),
        sa.Column('user_id',     sa.Integer(),  nullable=True),
        sa.Column('date',        sa.Date(),     nullable=False),
        sa.Column('burned_kcal', sa.Integer(),  nullable=True),
        sa.Column('target_kcal', sa.Integer(),  nullable=True),
        sa.Column('eaten_kcal',  sa.Integer(),  nullable=True),
        sa.Column('source',      sa.String(),   nullable=True),
        sa.Column('created_at',  sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_daily_calories_id', 'daily_calories', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_daily_calories_id', table_name='daily_calories')
    op.drop_table('daily_calories')
    op.drop_index('ix_meal_logs_id', table_name='meal_logs')
    op.drop_table('meal_logs')
    op.drop_index('ix_meals_id', table_name='meals')
    op.drop_table('meals')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id',    table_name='users')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS mealstate")
