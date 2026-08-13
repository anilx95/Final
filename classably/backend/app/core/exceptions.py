from datetime import datetime
import traceback

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.status import HTTP_404_NOT_FOUND

from sqlalchemy.exc import SQLAlchemyError


def error_response(
    status_code: int,
    message: str,
    error_code: str,
):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "error_code": error_code,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
):
    return error_response(
        exc.status_code,
        str(exc.detail),
        "HTTP_ERROR",
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed",
            "error_code": "VALIDATION_ERROR",
            "errors": exc.errors(),
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError,
):
    print("\n" + "=" * 70)
    print("SQLALCHEMY EXCEPTION")
    print("=" * 70)
    traceback.print_exc()
    print("=" * 70 + "\n")

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": str(exc),
            "error_code": "DATABASE_ERROR",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
):
    print("\n" + "=" * 70)
    print("UNHANDLED EXCEPTION")
    print("=" * 70)
    traceback.print_exc()
    print("=" * 70 + "\n")

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": str(exc),
            "error_code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def not_found_handler(
    request: Request,
    exc,
):
    return error_response(
        HTTP_404_NOT_FOUND,
        "Not Found",
        "NOT_FOUND",
    )