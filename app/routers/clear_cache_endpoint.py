@router.delete("/accounts/{customer_id}/clear-analysis-cache")
async def clear_analysis_cache(
    customer_id: UUID = Path(..., description="고객 ID"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    특정 고객의 모든 게시물 분석 캐시를 삭제합니다.
    """
    if current_user.id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
    
    try:
        from sqlalchemy import delete
        stmt = delete(PostAnalysisCache).where(PostAnalysisCache.customer_id == customer_id)
        result = await db.execute(stmt)
        await db.commit()
        
        logger.info(f"✅ Cleared {result.rowcount} analysis cache records for customer {customer_id}")
        
        return {
            "success": True,
            "deleted_count": result.rowcount,
            "message": f"{result.rowcount}개의 캐시 레코드를 삭제했습니다."
        }
    except Exception as e:
        logger.error(f"Failed to clear analysis cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"캐시 삭제 실패: {str(e)}")
