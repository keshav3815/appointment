from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    username: str  # Can be username or Gmail email
    password: str


class GoogleLoginRequest(BaseModel):
    token: str
