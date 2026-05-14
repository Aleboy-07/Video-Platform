from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Category
from pydantic import BaseModel

router = APIRouter(prefix="/categories", tags=["categories"])

class CategoryCreate(BaseModel):
    name: str
    description: str = None

@router.get("/")
def get_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()

@router.post("/")
def create_category(data: CategoryCreate, session: Session = Depends(get_session)):
    category = Category(name=data.name, description=data.description)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@router.get("/{id}/videos")
def get_category_videos(id: int, session: Session = Depends(get_session)):
    category = session.get(Category, id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return category.videos
