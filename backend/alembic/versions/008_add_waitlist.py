"""add waitlist

Revision ID: 008
Revises: 007
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision      = '008'
down_revision = '007'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'waitlist_signups',
        sa.Column('id',         sa.Integer(),  nullable=False),
        sa.Column('email',      sa.String(),   nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_waitlist_signups_id',    'waitlist_signups', ['id'],    unique=False)
    op.create_index('ix_waitlist_signups_email', 'waitlist_signups', ['email'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_waitlist_signups_email', table_name='waitlist_signups')
    op.drop_index('ix_waitlist_signups_id',    table_name='waitlist_signups')
    op.drop_table('waitlist_signups')
