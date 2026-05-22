"""add tags and meal_tags

Revision ID: 002
Revises: 001
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa

revision      = '002'
down_revision = '001'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'tags',
        sa.Column('id',       sa.Integer(), nullable=False),
        sa.Column('name',     sa.String(),  nullable=False),
        sa.Column('slug',     sa.String(),  nullable=False),
        sa.Column('tag_type', sa.String(),  nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_tags_id', 'tags', ['id'], unique=False)

    op.create_table(
        'meal_tags',
        sa.Column('meal_id', sa.Integer(), nullable=False),
        sa.Column('tag_id',  sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['meal_id'], ['meals.id']),
        sa.ForeignKeyConstraint(['tag_id'],  ['tags.id']),
        sa.PrimaryKeyConstraint('meal_id', 'tag_id'),
    )


def downgrade() -> None:
    op.drop_table('meal_tags')
    op.drop_index('ix_tags_id', table_name='tags')
    op.drop_table('tags')
