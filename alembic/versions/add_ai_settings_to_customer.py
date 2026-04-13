"""Add AI settings to customer table

Revision ID: add_ai_settings_to_customer
Revises: 
Create Date: 2026-01-27 16:12:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ai_settings_to_customer'
down_revision = None  # Update this to the latest migration revision
branch_labels = None
depends_on = None


def upgrade():
    # Add AI settings columns to customer table
    op.add_column('customer', sa.Column('system_prompt', sa.Text(), nullable=True))
    op.add_column('customer', sa.Column('is_ai_active', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('customer', sa.Column('ai_operate_start', sa.String(length=5), nullable=True, server_default='00:00'))
    op.add_column('customer', sa.Column('ai_operate_end', sa.String(length=5), nullable=True, server_default='23:59'))
    op.add_column('customer', sa.Column('ai_knowledge_base_url', sa.Text(), nullable=True))
    op.add_column('customer', sa.Column('ai_knowledge_base_filename', sa.String(length=255), nullable=True))
    op.add_column('customer', sa.Column('keyword_replies', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Optional: Migrate existing data from instagram_account to customer
    # This SQL will copy AI settings from the first instagram_account to customer
    op.execute("""
        UPDATE customer c
        SET 
            system_prompt = ia.system_prompt,
            is_ai_active = ia.is_ai_active,
            ai_operate_start = ia.ai_operate_start,
            ai_operate_end = ia.ai_operate_end,
            ai_knowledge_base_url = ia.ai_knowledge_base_url,
            ai_knowledge_base_filename = ia.ai_knowledge_base_filename,
            keyword_replies = ia.keyword_replies
        FROM instagram_account ia
        WHERE c.id = ia.customer_id
        AND (ia.system_prompt IS NOT NULL 
             OR ia.keyword_replies IS NOT NULL
             OR ia.ai_knowledge_base_url IS NOT NULL)
    """)


def downgrade():
    # Remove AI settings columns from customer table
    op.drop_column('customer', 'keyword_replies')
    op.drop_column('customer', 'ai_knowledge_base_filename')
    op.drop_column('customer', 'ai_knowledge_base_url')
    op.drop_column('customer', 'ai_operate_end')
    op.drop_column('customer', 'ai_operate_start')
    op.drop_column('customer', 'is_ai_active')
    op.drop_column('customer', 'system_prompt')
