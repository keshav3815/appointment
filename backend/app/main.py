from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from app.config import settings
from app.core.middleware import setup_middleware
from app.routers import (
    admin_appointments,
    admin_auth,
    admin_dashboard,
    admin_patients,
    admin_payments,
    admin_settings,
    appointments,
    csrf,
    otp,
    payments,
    public_config,
)

app = FastAPI(title="Doctor Appointment Booking System API")
setup_middleware(app)
app.include_router(csrf.router)
app.include_router(otp.router)
app.include_router(appointments.router)
app.include_router(payments.router)
app.include_router(public_config.router)
app.include_router(admin_auth.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_appointments.router)
app.include_router(admin_patients.router)
app.include_router(admin_payments.router)
app.include_router(admin_settings.router)


def _envelope(request: Request, message: str) -> dict:
    if request.url.path.startswith("/api/admin"):
        return {"success": False, "error": message}
    return {"status": "error", "message": message}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = first["loc"][-1] if first["loc"] else "field"
    return JSONResponse(
        status_code=422,
        content=_envelope(request, f"Invalid {field}: {first['msg']}"),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content=_envelope(request, exc.detail))


@app.get("/healthz")
def healthz():
    return {"status": "ok", "dev_mode": settings.DEV_MODE}


# ---- SPA static hosting (Phase 12 cutover) ----
# Mounted last so it never shadows the /api/* routers above. The React build
# (frontend/dist) is served as static files, with a catch-all fallback to
# index.html so client-side routes like /admin/appointments resolve on a
# direct page load/refresh instead of 404ing.
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="spa-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"status": "error", "message": "Not found."})

        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
