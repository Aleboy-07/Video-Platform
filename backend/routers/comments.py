from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Comment
from pydantic import BaseModel

router = APIRouter(prefix="/comments", tags=["comments"])

class CommentCreate(BaseModel):
    content: str
    user_id: int
    video_id: int

class CommentUpdate(BaseModel):
    content: str

@router.post("/")
def create_comment(data: CommentCreate, session: Session = Depends(get_session)):
    comment = Comment(
        content=data.content,
        user_id=data.user_id,
        video_id=data.video_id
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@router.put("/{id}")
def update_comment(id: int, data: CommentUpdate, session: Session = Depends(get_session)):
    comment = session.get(Comment, id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    comment.content = data.content
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@router.delete("/{id}")
def delete_comment(id: int, session: Session = Depends(get_session)):
    comment = session.get(Comment, id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    session.delete(comment)
    session.commit()
    return {"message": "Comentario eliminado"}
