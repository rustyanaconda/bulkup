"""add barcode queue

Revision ID: 010
Revises: 009
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa

revision      = '010'
down_revision = '009'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'barcode_queue',
        sa.Column('id',               sa.Integer(),  nullable=False),
        sa.Column('barcode',          sa.String(),   nullable=False),
        sa.Column('times_scanned',    sa.Integer(),  nullable=False, server_default='1'),
        sa.Column('first_scanned_at', sa.DateTime(), nullable=False),
        sa.Column('last_scanned_at',  sa.DateTime(), nullable=False),
        sa.Column('resolved',         sa.Boolean(),  nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_barcode_queue_id',      'barcode_queue', ['id'],      unique=False)
    op.create_index('ix_barcode_queue_barcode', 'barcode_queue', ['barcode'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_barcode_queue_barcode', table_name='barcode_queue')
    op.drop_index('ix_barcode_queue_id',      table_name='barcode_queue')
    op.drop_table('barcode_queue')
