
from fastapi import APIRouter, HTTPException
from app.services.ai_service import generate_ai_response
from pydantic import BaseModel, Field
from datetime import date
from typing import Literal

from app.services.appointment_service import (
    get_all_doctors,
    get_available_slots,
    book_appointment,
    cancel_appointment
)

router = APIRouter(prefix="/api", tags=["Appointments"])


class BookingRequest(BaseModel):
    patient_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=15)
    slot_id: int


class CancellationRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


@router.get("/doctors")
def doctors():
    return get_all_doctors()


@router.get("/slots")
def available_slots(doctor_id: int, slot_date: date):
    return get_available_slots(doctor_id, slot_date.isoformat())


@router.post("/book")
def book(request: BookingRequest):
    try:
        return book_appointment(
            request.patient_name,
            request.phone,
            request.slot_id
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))


@router.post("/cancel/{appointment_id}")
def cancel(appointment_id: int, request: CancellationRequest):
    try:
        return cancel_appointment(appointment_id, request.phone)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("/chat")
def chat(request: ChatRequest):
    try:
        answer = generate_ai_response(
            user_message=request.message,
            conversation_history=[
                message.model_dump()
                for message in request.history
            ]
        )

        return {"reply": answer}

    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error))
