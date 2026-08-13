from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import EmailStr


class UserCreate(BaseModel):

    full_name: str

    email: EmailStr

    password: str

    role: str = "student"


class UserLogin(BaseModel):

    email: EmailStr

    password: str


class UserResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    full_name: str

    email: EmailStr

    role: str

    is_active: bool


class Token(BaseModel):

    access_token: str

    token_type: str = "bearer"