from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DB_TYPE: str = "sqlite"
    DB_PATH: str = "backend_dev.sqlite"

    DB_HOST: str = "127.0.0.1"
    DB_NAME: str = "appointment_system"
    DB_USER: str = "root"
    DB_PASS: str = "example"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # App
    CONSULTATION_FEE: int = 500
    CURRENCY: str = "INR"
    OTP_EXPIRY: int = 5
    DEV_MODE: bool = True

    # Session / JWT
    SESSION_SECRET_KEY: str = "change-me-session-secret"
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_EXPIRE_MINUTES: int = 480

    # Frontend
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # SMTP (can be provided via .env to avoid DB migrations)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: str = "587"
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Doctor Appointment System"
    SMTP_ENCRYPTION: str = "tls"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    @property
    def database_url(self) -> str:
        if self.DB_TYPE.lower() == "sqlite":
            return f"sqlite:///{self.DB_PATH}"

        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def payment_demo_mode(self) -> bool:
        return (
            self.DEV_MODE
            or not self.RAZORPAY_KEY_ID
            or not self.RAZORPAY_KEY_SECRET
            or self.RAZORPAY_KEY_ID.startswith("rzp_test_XXXXXXXX")
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()