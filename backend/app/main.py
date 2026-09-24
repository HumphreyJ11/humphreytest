from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Topic
from app.schemas import TopicCreate, TopicRead, TopicUpdate


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://humphreytest.vercel.app",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Hello from LearnLog"}


@app.get("/topics", response_model=list[TopicRead])
async def get_topics(
    db: Session = Depends(get_db),
    _current_user: UUID = Depends(get_current_user),
) -> list[Topic]:
    return list(db.scalars(select(Topic).order_by(Topic.id)))


@app.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db),
    _current_user: UUID = Depends(get_current_user),
) -> Topic:
    new_topic = Topic(**topic.model_dump())
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic


@app.get("/topics/{topic_id}", response_model=TopicRead)
async def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    _current_user: UUID = Depends(get_current_user),
) -> Topic:
    topic = db.get(Topic, topic_id)

    if topic is not None:
        return topic

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")


@app.patch("/topics/{topic_id}", response_model=TopicRead)
async def update_topic(
    topic_id: int,
    topic_update: TopicUpdate,
    db: Session = Depends(get_db),
    _current_user: UUID = Depends(get_current_user),
) -> Topic:
    topic = db.get(Topic, topic_id)

    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    for field, value in topic_update.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)

    db.commit()
    db.refresh(topic)
    return topic


@app.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    _current_user: UUID = Depends(get_current_user),
) -> None:
    topic = db.get(Topic, topic_id)

    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    db.delete(topic)
    db.commit()
