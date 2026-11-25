import os
import json
import re

from dotenv import load_dotenv
from groq import Groq

from app.services.appointment_service import (
    get_all_doctors,
    get_available_slots,
    book_appointment,
    cancel_appointment
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing from the .env file")

client = Groq(api_key=GROQ_API_KEY)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_all_doctors",
            "description": "Get all doctors, their specializations and consultation fees.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": "Get available appointment slots for a doctor on a specific date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "integer"
                    },
                    "slot_date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format."
                    }
                },
                "required": ["doctor_id", "slot_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment only after explicit patient confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_name": {
                        "type": "string"
                    },
                    "phone": {
                        "type": "string"
                    },
                    "slot_id": {
                        "type": "integer"
                    }
                },
                "required": ["patient_name", "phone", "slot_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel a confirmed appointment only after explicit patient confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {
                        "type": "integer"
                    },
                    "phone": {
                        "type": "string"
                    }
                },
                "required": ["appointment_id", "phone"]
            }
        }
    }
]


def execute_tool(
    tool_name,
    arguments,
    allow_booking=False,
    allow_cancellation=False
):
    if tool_name == "get_all_doctors":
        return get_all_doctors()

    if tool_name == "get_available_slots":
        return get_available_slots(
            arguments["doctor_id"],
            arguments["slot_date"]
        )

    if tool_name == "book_appointment":
        if not allow_booking:
            return {
                "success": False,
                "error": "Explicit patient confirmation is required."
            }

        try:
            result = book_appointment(
                arguments["patient_name"],
                arguments["phone"],
                arguments["slot_id"]
            )
            return {
                "success": True,
                **result
            }
        except ValueError as error:
            return {
                "success": False,
                "error": str(error)
            }

    if tool_name == "cancel_appointment":
        if not allow_cancellation:
            return {
                "success": False,
                "error": "Explicit patient confirmation is required."
            }

        try:
            result = cancel_appointment(
                arguments["appointment_id"],
                arguments["phone"]
            )
            return {
                "success": True,
                **result
            }
        except ValueError as error:
            return {
                "success": False,
                "error": str(error)
            }

    return {
        "success": False,
        "error": "Unknown tool."
    }


def generate_ai_response(user_message, conversation_history=None):
    try:
        history = conversation_history or []

        last_assistant_message = next(
            (
                item["content"]
                for item in reversed(history)
                if item["role"] == "assistant"
            ),
            ""
        )

        confirmation_requested = (
            "book" in last_assistant_message.lower()
            and "confirm" in last_assistant_message.lower()
        )

        cancellation_requested = (
            "cancel" in last_assistant_message.lower()
            and "confirm" in last_assistant_message.lower()
        )

        explicit_confirmation = bool(
            re.fullmatch(
                r"\s*(yes|yes please|confirm|confirmed|proceed|"
                r"book it|go ahead|yes confirm|please book it|"
                r"i confirm|confirm booking|yes cancel|"
                r"please cancel|confirm cancellation)[.! ]*\s*",
                user_message,
                re.IGNORECASE
            )
        )

        allow_booking = (
            confirmation_requested and explicit_confirmation
        )

        allow_cancellation = (
            cancellation_requested and explicit_confirmation
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a friendly AI doctor appointment assistant. "
                    "Help patients find doctors, check available slots, "
                    "book appointments and cancel appointments. "
                    "Use tools for all doctor, slot and appointment operations. "
                    "Never invent doctors, fees, dates, slots or booking results. "
                    "Ask for the patient's name and phone number before booking. "
                    "Ask the patient to select an available slot. "
                    "Before booking, summarize the doctor, date, time, "
                    "patient name and phone number, then explicitly ask "
                    "the patient to confirm the booking. "
                    "Only call book_appointment after explicit confirmation. "
                    "For cancellation, ask for the appointment ID and "
                    "registered phone number. Summarize the cancellation "
                    "request and explicitly ask the patient to confirm. "
                    "Only call cancel_appointment after explicit confirmation. "
                    "If a tool returns success false, explain the error. "
                    "Never claim an appointment was booked or cancelled "
                    "unless the corresponding tool returns success true. "
                    "Do not diagnose medical conditions. "
                    "Do not ask about insurance or location. "
                    "Be concise, friendly and conversational."
                )
            }
        ]

        for item in history[-20:]:
            if item["role"] in ("user", "assistant"):
                messages.append({
                    "role": item["role"],
                    "content": item["content"]
                })

        messages.append({
            "role": "user",
            "content": user_message
        })

        for _ in range(4):
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3,
                max_tokens=700
            )

            assistant_message = response.choices[0].message

            if not assistant_message.tool_calls:
                return assistant_message.content or (
                    "Sorry, I couldn't generate a response."
                )

            messages.append(assistant_message)

            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(
                    tool_call.function.arguments
                )

                result = execute_tool(
                    tool_name,
                    arguments,
                    allow_booking=allow_booking,
                    allow_cancellation=allow_cancellation
                )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })

        return "I couldn't complete that request. Please try again."

    except Exception as error:
        print("Groq API error:", error)
        raise RuntimeError(
            "Unable to generate AI response."
        ) from error