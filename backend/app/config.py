from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DB_HOST: str = "localhost"
    DB_NAME: str = "appointment_system"
    DB_USER: str = "root"
    DB_PASS: str = ""

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    CONSULTATION_FEE: int = 500
    CURRENCY: str = "INR"
    OTP_EXPIRY: int = 5
    DEV_MODE: bool = True

    SESSION_SECRET_KEY: str = "dev-session-secret"
    JWT_SECRET_KEY: str = "dev-jwt-secret"
    JWT_EXPIRE_MINUTES: int = 480

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def payment_demo_mode(self) -> bool:
        """True until real Razorpay credentials are set in .env — simulates a
        successful payment instead of calling the Razorpay API, so the booking
        flow is fully demoable without live keys. Flips off automatically the
        moment real RAZORPAY_KEY_ID/SECRET values are configured."""
        return (
            not self.RAZORPAY_KEY_ID
            or not self.RAZORPAY_KEY_SECRET
            or "XXXX" in self.RAZORPAY_KEY_ID
            or "XXXX" in self.RAZORPAY_KEY_SECRET
        )


settings = Settings()
