import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Stethoscope,
  CalendarDays,
  Clock,
  UserRound,
  Phone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Check,
  Loader2,
  Sunrise,
  Sun,
  Moon,
  ShieldCheck,
  Mic
} from "lucide-react";
import ChatAssistant from "./components/ChatAssistant";

const API = "http://127.0.0.1:8000/api";

interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  consultation_fee: number;
}

interface Slot {
  slot_id: number;
  slot_date: string;
  slot_time: string;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return toDateString(new Date());
}

function getNextDays(count: number) {
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: toDateString(d),
      weekday: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString("en-IN", { month: "short" })
    };
  });
}

function formatDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function getInitials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPeriod(time: string): "Morning" | "Afternoon" | "Evening" | "Other" {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "Other";
  let hour = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const periodMeta = {
  Morning: { icon: Sunrise, label: "Morning" },
  Afternoon: { icon: Sun, label: "Afternoon" },
  Evening: { icon: Moon, label: "Evening" },
  Other: { icon: Clock, label: "Available" }
} as const;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

function SectionTitle({
  step,
  title,
  subtitle,
  done
}: {
  step: number;
  title: string;
  subtitle: string;
  done: boolean;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
          done
            ? "bg-emerald-500 text-white"
            : "bg-blue-600 text-white ring-4 ring-blue-100"
        }`}
      >
        {done ? <Check size={15} strokeWidth={3} /> : step}
      </span>
      <div>
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function App() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => getNextDays(7), []);

  const selectedDoctor = doctors.find(
    (doctor) => String(doctor.doctor_id) === doctorId
  );
  const selectedSlot = slots.find((slot) => String(slot.slot_id) === slotId);

  const groupedSlots = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    slots.forEach((slot) => {
      const period = getPeriod(slot.slot_time);
      (groups[period] = groups[period] || []).push(slot);
    });
    return (["Morning", "Afternoon", "Evening", "Other"] as const)
      .filter((p) => groups[p]?.length)
      .map((p) => ({ period: p, items: groups[p] }));
  }, [slots]);

  const showError = (text: string) => {
    setMessageType("error");
    setMessage(text);
  };

  const showSuccess = (text: string) => {
    setMessageType("success");
    setMessage(text);
  };

  useEffect(() => {
    axios
      .get(`${API}/doctors`)
      .then((response) => {
        setDoctors(response.data);

        if (response.data.length > 0) {
          setDoctorId(String(response.data[0].doctor_id));
        }
      })
      .catch(() => showError("Could not load doctors. Please refresh the page."));
  }, []);

  const fetchSlots = async () => {
    if (!doctorId || !slotDate) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSlotId("");

    try {
      const response = await axios.get(`${API}/slots`, {
        params: {
          doctor_id: doctorId,
          slot_date: slotDate
        }
      });

      setSlots(response.data);
    } catch {
      setSlots([]);
      showError("Could not load available slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [doctorId, slotDate]);

  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [message]);

  const handleBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slotId) {
      showError("Please select an available appointment slot.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(`${API}/book`, {
        patient_name: patientName,
        phone,
        slot_id: Number(slotId)
      });

      showSuccess(
        `Appointment confirmed! Your appointment ID is ${response.data.appointment_id}.`
      );

      setPatientName("");
      setPhone("");
      setSlotId("");

      const updated = await axios.get(`${API}/slots`, {
        params: {
          doctor_id: doctorId,
          slot_date: slotDate
        }
      });

      setSlots(updated.data);
    } catch (error: any) {
      showError(
        error.response?.data?.detail ||
          "Booking failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const detailsDone = patientName.trim().length >= 2 && phone.trim().length >= 10;
  const stepsDone = [!!doctorId, !!slotId, detailsDone].filter(Boolean).length;

  const missingHint = !doctorId
    ? "Choose a doctor to continue"
    : !slotDate
    ? "Pick a date to see available slots"
    : !slotId
    ? "Select a time slot"
    : !detailsDone
    ? "Enter your name and phone number"
    : "";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Stethoscope size={22} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              MediAssist <span className="text-blue-600">AI</span>
            </h1>
          </div>

          <div
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
            role="status"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Services online
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                See a doctor, <span className="text-blue-200">without the wait.</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-blue-100 sm:text-base">
                Book in three quick steps below, or just tell the AI assistant
                what you need, by voice or text.
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-3 lg:grid-cols-1">
              <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
                <CalendarDays size={18} className="text-blue-200" />
                Instant slot availability
              </li>
              <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
                <Mic size={18} className="text-blue-200" />
                Book by voice or chat
              </li>
              <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
                <ShieldCheck size={18} className="text-blue-200" />
                Instant confirmation ID
              </li>
            </ul>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_1fr]">
          {/* Booking */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Book an Appointment
                  </h3>
                  <p className="text-xs text-slate-500">
                    {stepsDone} of 3 steps completed
                  </p>
                </div>
                <CalendarDays className="text-blue-600" size={22} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${(stepsDone / 3) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleBooking} className="space-y-9 p-5 sm:p-7">
              {/* Step 1 */}
              <div>
                <SectionTitle
                  step={1}
                  title="Choose your doctor"
                  subtitle="Select a specialist for your consultation"
                  done={!!doctorId}
                />

                {doctors.length === 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : (
                  <div
                    className="grid max-h-[22rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label="Select Doctor"
                  >
                    {doctors.map((doctor) => {
                      const active = String(doctor.doctor_id) === doctorId;
                      return (
                        <button
                          key={doctor.doctor_id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setDoctorId(String(doctor.doctor_id));
                            setMessage("");
                          }}
                          className={`relative flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                            active
                              ? "border-blue-600 bg-blue-50/70 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {getInitials(doctor.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {doctor.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {doctor.specialization}
                            </p>
                            <p className="mt-1 text-sm font-bold text-blue-700">
                              ₹{doctor.consultation_fee}
                              <span className="ml-1 text-[11px] font-normal text-slate-400">
                                / visit
                              </span>
                            </p>
                          </div>
                          {active && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div>
                <SectionTitle
                  step={2}
                  title="Pick a date & time"
                  subtitle="Only open slots are shown"
                  done={!!slotId}
                />

                <div
                  className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
                  role="radiogroup"
                  aria-label="Quick date selection"
                >
                  {days.map((day) => {
                    const active = slotDate === day.value;
                    return (
                      <button
                        key={day.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setSlotDate(day.value);
                          setMessage("");
                        }}
                        className={`flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl border-2 py-2.5 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-medium uppercase tracking-wide ${
                            active ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {day.weekday}
                        </span>
                        <span className="text-xl font-bold leading-tight">
                          {day.day}
                        </span>
                        <span
                          className={`text-[11px] ${
                            active ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {day.month}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <label
                    htmlFor="date"
                    className="shrink-0 text-xs font-medium text-slate-500"
                  >
                    Or choose another date
                  </label>
                  <input
                    id="date"
                    required
                    type="date"
                    min={getTodayDate()}
                    value={slotDate}
                    onChange={(event) => {
                      setSlotDate(event.target.value);
                      setMessage("");
                    }}
                    className={`${inputClass} !py-2`}
                  />
                </div>

                <div className="mb-3 mt-6 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {slotDate ? formatDate(slotDate) : "Available time slots"}
                  </span>

                  <button
                    type="button"
                    onClick={fetchSlots}
                    disabled={!slotDate || loadingSlots}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-40"
                  >
                    <RefreshCw
                      size={13}
                      className={loadingSlots ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                {!slotDate ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <CalendarDays className="mx-auto mb-2 text-slate-400" size={24} />
                    <p className="text-sm text-slate-500">
                      Select a date to view available slots.
                    </p>
                  </div>
                ) : loadingSlots ? (
                  <div
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                    aria-busy="true"
                    aria-label="Loading available slots"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : slots.length > 0 ? (
                  <div className="space-y-4">
                    {groupedSlots.map(({ period, items }) => {
                      const Icon = periodMeta[period].icon;
                      return (
                        <div key={period}>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            <Icon size={14} />
                            {periodMeta[period].label}
                          </p>
                          <div
                            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                            role="radiogroup"
                            aria-label={`${periodMeta[period].label} slots`}
                          >
                            {items.map((slot) => {
                              const active = slotId === String(slot.slot_id);
                              return (
                                <button
                                  key={slot.slot_id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  onClick={() => setSlotId(String(slot.slot_id))}
                                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                                    active
                                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                                  }`}
                                >
                                  {slot.slot_time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-center text-sm text-amber-700">
                    No available slots for this date. Try another day.
                  </div>
                )}
              </div>

              {/* Step 3 */}
              <div>
                <SectionTitle
                  step={3}
                  title="Your details"
                  subtitle="We'll use these to confirm your booking"
                  done={detailsDone}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="patientName"
                      className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <UserRound size={15} className="text-slate-400" />
                      Patient Name
                    </label>
                    <input
                      id="patientName"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <Phone size={15} className="text-slate-400" />
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      minLength={10}
                      maxLength={15}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Enter your phone number"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Confirm */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <UserRound size={16} className="text-blue-600" />
                    {selectedDoctor?.name ?? "No doctor selected"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={16} className="text-blue-600" />
                    {slotDate && selectedSlot
                      ? `${formatDate(slotDate)} · ${selectedSlot.slot_time}`
                      : "No time selected yet"}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || loadingSlots || !doctorId || !slotId}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Booking Appointment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Confirm Appointment
                    </>
                  )}
                </button>

                {missingHint && !loading && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    {missingHint}
                  </p>
                )}
              </div>

              {message && (
                <div
                  ref={messageRef}
                  role={messageType === "error" ? "alert" : "status"}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  )}
                  <span className="font-medium">{message}</span>
                </div>
              )}
            </form>
          </section>

          {/* Assistant */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
            <ChatAssistant />
          </section>
        </div>

        <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-400">
          MediAssist AI · Powered by Groq and ElevenLabs
        </footer>
      </div>
    </main>
  );
}

export default App;