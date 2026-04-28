"""Add AI reply trial counters to subscriptions

Revision ID: add_ai_reply_trial_to_subscriptions
Revises: add_email_blocked_to_customer
Create Date: 2026-04-24 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ai_reply_trial_to_subscriptions'
down_revision = 'add_email_blocked_to_customer'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('subscriptions', sa.Column('ai_reply_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('subscriptions', sa.Column('ai_reply_limit', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('subscriptions', 'ai_reply_limit')
    op.drop_column('subscriptions', 'ai_reply_count')

