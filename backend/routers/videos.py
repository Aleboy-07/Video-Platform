from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from database import get_session
from models import Video, Comment
from s3_utils import upload_file
import random

router = APIRouter(prefix="/videos", tags=["videos"])


# ── GET todos los videos ──
@router.get("/")
def get_videos(session: Session = Depends(get_session)):
    return session.exec(select(Video)).all()


# ── GET videos recientes ──
@router.get("/recent")
def get_recent(session: Session = Depends(get_session)):
    return session.exec(
        select(Video).order_by(Video.created_at.desc()).limit(10)
    ).all()


# ── GET videos recomendados (random global) ──
@router.get("/recommended")
def get_recommended(session: Session = Depends(get_session)):
    videos = session.exec(select(Video)).all()
    return random.sample(videos, min(10, len(videos)))


# ── GET buscar por título ──
@router.get("/search")
def search_videos(q: str, session: Session = Depends(get_session)):
    return session.exec(
        select(Video).where(Video.title.ilike(f"%{q}%"))
    ).all()


# ── GET videos por categoría ──
@router.get("/category/{id}")
def get_by_category(id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Video).where(Video.category_id == id)
    ).all()


# ── GET 10 aleatorios por categoría (recomendaciones del aside) ──
@router.get("/category/{id}/random")
def get_random_by_category(id: int, session: Session = Depends(get_session)):
    videos = session.exec(
        select(Video).where(Video.category_id == id)
    ).all()
    return random.sample(videos, min(10, len(videos)))


# ── GET video por ID ──
@router.get("/{id}")
def get_video(id: int, session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    # incrementar vistas
    video.views += 1
    session.add(video)
    session.commit()
    session.refresh(video)
    return video


# ── GET comentarios de un video ──
@router.get("/{id}/comments")
def get_video_comments(id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Comment).where(Comment.video_id == id)
    ).all()


# ── POST subir video ──
@router.post("/")
async def upload_video(
    title: str = Form(...),
    description: str = Form(None),
    user_id: int = Form(...),
    category_id: int = Form(...),
    duration: int = Form(None),
    video_file: UploadFile = File(...),
    thumbnail_file: UploadFile = File(None),
    session: Session = Depends(get_session)
):
    # validar tipo de archivo
    if not video_file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un video")

    video_url = upload_file(video_file, "videos")
    thumbnail_url = None
    if thumbnail_file:
        thumbnail_url = upload_file(thumbnail_file, "thumbnails")

    video = Video(
        title=title,
        description=description,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        user_id=user_id,
        category_id=category_id,
        duration=duration
    )
    session.add(video)
    session.commit()
    session.refresh(video)
    return video


# ── PUT actualizar miniatura ──
@router.put("/{id}/thumbnail")
async def update_thumbnail(
    id: int,
    thumbnail_file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    video.thumbnail_url = upload_file(thumbnail_file, "thumbnails")
    session.add(video)
    session.commit()
    session.refresh(video)
    return video


# ── PUT dar like a un video ──
@router.put("/{id}/like")
def like_video(id: int, session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    video.likes += 1
    session.add(video)
    session.commit()
    session.refresh(video)
    return {"likes": video.likes}


# ── PUT actualizar info del video ──
@router.put("/{id}")
def update_video(
    id: int,
    title: str = Form(None),
    description: str = Form(None),
    category_id: int = Form(None),
    session: Session = Depends(get_session)
):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    if title: video.title = title
    if description: video.description = description
    if category_id: video.category_id = category_id
    session.add(video)
    session.commit()
    session.refresh(video)
    return video


# ── DELETE eliminar video ──
@router.delete("/{id}")
def delete_video(id: int, session: Session = Depends(get_session)):
    video = session.get(Video, id)
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    session.delete(video)
    session.commit()
    return {"message": "Video eliminado"}
