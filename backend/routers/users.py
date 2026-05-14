from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from database import get_session
from models import User
from s3_utils import upload_file
from pydantic import BaseModel
import bcrypt

router = APIRouter(prefix="/users", tags=["users"])

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(data: UserRegister, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email}

@router.post("/login")
def login(data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"id": user.id, "username": user.username, "email": user.email}

@router.get("/")
def get_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in users]

@router.get("/{id}")
def get_user(id: int, session: Session = Depends(get_session)):
    user = session.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"id": user.id, "username": user.username, "avatar_url": user.avatar_url}

@router.get("/{id}/videos")
def get_user_videos(id: int, session: Session = Depends(get_session)):
    user = session.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user.videos

@router.put("/{id}/avatar")
async def update_avatar(
    id: int,
    avatar_file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    user = session.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.avatar_url = upload_file(avatar_file, "avatars")
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"avatar_url": user.avatar_url}
