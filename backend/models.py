from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    avatar_url: Optional[str] = None

    videos: List["Video"] = Relationship(back_populates="user")
    comments: List["Comment"] = Relationship(back_populates="user")


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None

    videos: List["Video"] = Relationship(back_populates="category")


class Video(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    views: int = Field(default=0)
    likes: int = Field(default=0)
    duration: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user_id: int = Field(foreign_key="user.id")
    category_id: int = Field(foreign_key="category.id")

    user: Optional["User"] = Relationship(back_populates="videos")
    category: Optional["Category"] = Relationship(back_populates="videos")
    comments: List["Comment"] = Relationship(back_populates="video")


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user_id: int = Field(foreign_key="user.id")
    video_id: int = Field(foreign_key="video.id")

    user: Optional["User"] = Relationship(back_populates="comments")
    video: Optional["Video"] = Relationship(back_populates="comments")
