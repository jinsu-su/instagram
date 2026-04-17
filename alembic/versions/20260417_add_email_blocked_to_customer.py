"""Add email blocked columns to customer table

Revision ID: add_email_blocked_to_customer
Revises: add_ai_settings_to_customer
Create Date: 2026-04-17 11:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_blocked_to_customer'
down_revision = 'add_ai_settings_to_customer'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email reputation management columns to customer table
    op.add_column('customer', sa.Column('is_email_blocked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('customer', sa.Column('email_block_reason', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove email reputation management columns from customer table
    op.drop_column('customer', 'email_block_reason')
    op.drop_column('customer', 'is_email_blocked')
