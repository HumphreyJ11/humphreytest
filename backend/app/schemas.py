from pydantic import BaseModel, ConfigDict


class TopicCreate(BaseModel):
    title: str
    description: str | None = None


class TopicUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class TopicRead(TopicCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
