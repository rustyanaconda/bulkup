"""add burn snapshots

Revision ID: 005
Revises: 004
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision      = '005'
down_revision = '004'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'burn_snapshots',
        sa.Column('id',          sa.Integer(),  nullable=False),
        sa.Column('user_id',     sa.Integer(),  nullable=False),
        sa.Column('date',        sa.Date(),     nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('burned_kcal', sa.Integer(),  nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_burn_snapshots_id',      'burn_snapshots', ['id'],              unique=False)
    op.create_index('ix_burn_snapshots_user_id', 'burn_snapshots', ['user_id'],         unique=False)
    op.create_index('ix_burn_snapshots_user_date','burn_snapshots', ['user_id', 'date'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_burn_snapshots_user_date', table_name='burn_snapshots')
    op.drop_index('ix_burn_snapshots_user_id',   table_name='burn_snapshots')
    op.drop_index('ix_burn_snapshots_id',        table_name='burn_snapshots')
    op.drop_table('burn_snapshots')
