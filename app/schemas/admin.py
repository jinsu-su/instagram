from typing import List

from pydantic import BaseModel

from app.schemas.customer import CustomerResponse


class CustomerListResponse(BaseModel):
    page: int
    page_size: int
    total: int
    results: List[CustomerResponse]

