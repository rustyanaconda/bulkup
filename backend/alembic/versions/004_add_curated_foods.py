"""add curated foods

Revision ID: 004
Revises: 003
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision      = '004'
down_revision = '003'
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        'foods',
        sa.Column('id',       sa.Integer(), nullable=False),
        sa.Column('name',     sa.String(),  nullable=False),
        sa.Column('category', sa.String(),  nullable=True),
        sa.Column('fdc_id',   sa.Integer(), nullable=True),
        sa.Column('source',   sa.String(),  nullable=True),

        # Macros per 100g
        sa.Column('calories',        sa.Float(), nullable=True),
        sa.Column('protein_g',       sa.Float(), nullable=True),
        sa.Column('carbs_g',         sa.Float(), nullable=True),
        sa.Column('fat_g',           sa.Float(), nullable=True),
        sa.Column('fiber_g',         sa.Float(), nullable=True),
        sa.Column('sugar_g',         sa.Float(), nullable=True),
        sa.Column('saturated_fat_g', sa.Float(), nullable=True),

        # Micronutrients per 100g
        sa.Column('sodium_mg',      sa.Float(), nullable=True),
        sa.Column('potassium_mg',   sa.Float(), nullable=True),
        sa.Column('calcium_mg',     sa.Float(), nullable=True),
        sa.Column('iron_mg',        sa.Float(), nullable=True),
        sa.Column('magnesium_mg',   sa.Float(), nullable=True),
        sa.Column('zinc_mg',        sa.Float(), nullable=True),
        sa.Column('phosphorus_mg',  sa.Float(), nullable=True),
        sa.Column('copper_mg',      sa.Float(), nullable=True),
        sa.Column('manganese_mg',   sa.Float(), nullable=True),
        sa.Column('selenium_ug',    sa.Float(), nullable=True),
        sa.Column('vitamin_a_ug',   sa.Float(), nullable=True),
        sa.Column('vitamin_c_mg',   sa.Float(), nullable=True),
        sa.Column('vitamin_d_ug',   sa.Float(), nullable=True),
        sa.Column('vitamin_e_mg',   sa.Float(), nullable=True),
        sa.Column('vitamin_k_ug',   sa.Float(), nullable=True),
        sa.Column('thiamin_mg',     sa.Float(), nullable=True),
        sa.Column('riboflavin_mg',  sa.Float(), nullable=True),
        sa.Column('niacin_mg',      sa.Float(), nullable=True),
        sa.Column('vitamin_b6_mg',  sa.Float(), nullable=True),
        sa.Column('folate_ug',      sa.Float(), nullable=True),
        sa.Column('vitamin_b12_ug', sa.Float(), nullable=True),
        sa.Column('cholesterol_mg', sa.Float(), nullable=True),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_foods_id',   'foods', ['id'],   unique=False)
    op.create_index('ix_foods_name', 'foods', ['name'], unique=False)

    op.create_table(
        'food_portions',
        sa.Column('id',         sa.Integer(), nullable=False),
        sa.Column('food_id',    sa.Integer(), nullable=False),
        sa.Column('label',      sa.String(),  nullable=False),
        sa.Column('grams',      sa.Float(),   nullable=False),
        sa.Column('is_default', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_food_portions_id', 'food_portions', ['id'], unique=False)

    op.create_table(
        'food_tags',
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('tag_id',  sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id']),
        sa.ForeignKeyConstraint(['tag_id'],  ['tags.id']),
        sa.PrimaryKeyConstraint('food_id', 'tag_id'),
    )


def downgrade() -> None:
    op.drop_table('food_tags')
    op.drop_index('ix_food_portions_id', table_name='food_portions')
    op.drop_table('food_portions')
    op.drop_index('ix_foods_name', table_name='foods')
    op.drop_index('ix_foods_id',   table_name='foods')
    op.drop_table('foods')
