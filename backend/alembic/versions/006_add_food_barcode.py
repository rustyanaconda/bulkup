"""add food barcode

Revision ID: 006
Revises: 005
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision      = '006'
down_revision = '005'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column('foods', sa.Column('barcode', sa.String(), nullable=True))
    op.create_index('ix_foods_barcode', 'foods', ['barcode'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_foods_barcode', table_name='foods')
    op.drop_column('foods', 'barcode')
