from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.flow import Flow as FlowModel
from app.models.customer import Customer
from app.schemas.flow import Flow, FlowCreate, FlowUpdate
from app.routers.admin_auth import get_current_user

router = APIRouter()


@router.get("/flows", response_model=List[Flow])
async def list_flows(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all flows for a customer."""
    customer_id = current_user.id
    query = select(FlowModel).where(FlowModel.customer_id == customer_id).order_by(FlowModel.created_at.desc())
    result = await db.execute(query)
    flows = result.scalars().all()
    return flows


@router.post("/flows", response_model=Flow, status_code=status.HTTP_201_CREATED)
async def create_flow(
    payload: FlowCreate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new flow."""
    customer_id = current_user.id
    new_flow = FlowModel(
        **payload.model_dump(),
        customer_id=customer_id
    )
    db.add(new_flow)
    await db.commit()
    await db.refresh(new_flow)
    return new_flow


@router.get("/flows/{flow_id}", response_model=Flow)
async def get_flow(
    flow_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific flow."""
    query = select(FlowModel).where(
        FlowModel.id == flow_id,
        FlowModel.customer_id == current_user.id
    )
    result = await db.execute(query)
    flow = result.scalar_one_or_none()
    
    if not flow:
        raise HTTPException(status_code=404, detail="플로우를 찾을 수 없습니다.")
    
    return flow


@router.put("/flows/{flow_id}", response_model=Flow)
async def update_flow(
    flow_id: UUID,
    payload: FlowUpdate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a flow."""
    query = select(FlowModel).where(
        FlowModel.id == flow_id,
        FlowModel.customer_id == current_user.id
    )
    result = await db.execute(query)
    flow = result.scalar_one_or_none()
    
    if not flow:
        raise HTTPException(status_code=404, detail="플로우를 찾을 수 없습니다.")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(flow, key, value)
    
    await db.commit()
    await db.refresh(flow)
    return flow


@router.delete("/flows/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(
    flow_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a flow."""
    query = select(FlowModel).where(
        FlowModel.id == flow_id,
        FlowModel.customer_id == current_user.id
    )
    result = await db.execute(query)
    flow = result.scalar_one_or_none()
    
    if not flow:
        raise HTTPException(status_code=404, detail="플로우를 찾을 수 없습니다.")
    
    await db.delete(flow)
    await db.commit()
    return None
