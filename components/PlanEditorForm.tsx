"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseWorkoutPlanText } from "@/lib/services/plan-text-parser";
import { Role } from "@/types";

type UserOption = {
  userId: string;
  name: string;
  mobile: string;
};

type Props = {
  role: Role;
  action: string;
  users: UserOption[];
  initialUserId?: string;
  initialPlanId?: string;
  initialTitle?: string;
  initialWeekStartDate?: string;
  initialStatus?: string;
  initialOverallNotes?: string;
  initialPlanJson?: string;
  initialPlanText?: string;
  submitLabel: string;
};

type DayExercise = {
  exerciseName: string;
  sets: number;
  reps: string;
  restSec: number;
  notes: string;
};

type PreviewDay = {
  dayNumber: number;
  focus: string;
  notes: string;
  exercises: DayExercise[];
};

const PLAN_TEXT_TEMPLATE = `Day 1 - Legs 
  1.0 Leg swings front and sideways
  1.1 free Squats - 3x12
  1.2 weighted squats - 3x10
  1.3 leg curls - 4x12
  1.4 leg extensions - 4x12
  1.5 leg press 3x12
  1.6 calf raises 20x4 

Day 2 - Chest 
  2.0 pushups - 3x10
  2.1 flat chest press 3x12
  2.2 incline bench press 3x12
  2.3 pec dec flies 4x12
  2.4 decline cable flies 3x12
  2.5 abs crunches 15x4
  2.6 legs raises 15x4
  2.7 cycling 15 mins

Day 3 - Back 
  3.1 lat pulley down 4x12
  3.2 seated rowings 4x12
  3.3 straight arm pulley down 3x10
  3.4 rear delt flies 3x10
  3.5 single arm rows 3x10
  3.6 treadmill or cycling 15 mins

Day 4 - Shoulders 
  4.1 shoulder dumbbell press - 4x10
  4.2 military press / machine press 3x10
  4.3 side lateral raises - 4x12
  4.4 front raises - 3x10
  4.5 shrugs - 4x12
  4.6 cycling 15 mins

Day 5 - Arms 
  5.1 Tricep dumbell extension-4x12
  5.2 dumbell curls - 4x12
  5.3 pulley push down - 3x12
  5.4 hammer curls- 3x12
  5.5 single arm triceps extension- 3x12
  5.6 preacher curls - 3x12
  5.7 abs crunches - 15x4
  5.8 legs raises- 15x4
  5.9 cycling 10 mins

Day 6 - Cardio and stretching 
  6.1 15 mins treadmill 
  6.2 20 mins cycling 
  6.3 10 mins cross trainers 
  6.4 Proper stretching of every body part / Yoga
  
Notes :
 1. sip water with lemon or pink salt during workout 
 2. Complete 12k steps daily
 3. Proper warmup and cooldown of body 
 4. Use weights carefully.`;

function isDurationExercise(ex: DayExercise): boolean {
  const reps = cleanReps(ex.reps).toLowerCase();
  const name = (ex.exerciseName || "").toLowerCase();
  return (
    /mins?|minutes?/.test(reps) ||
    /\b(cardio|cycling|treadmill|cross trainer|elliptical|walk|run|jog)\b/.test(name) ||
    (ex.notes || "").toLowerCase().includes("cardio")
  );
}

function cleanReps(reps: string): string {
  const value = (reps || "").trim();
  return value.toLowerCase() === "as prescribed" ? "" : value;
}

function getDurationMinutes(ex: DayExercise): string {
  const fromReps = (ex.reps || "").match(/(\d+)\s*(?:mins?|minutes?)/i);
  if (fromReps?.[1]) return fromReps[1];
  const fromName = (ex.exerciseName || "").match(/(\d+)\s*(?:mins?|minutes?)/i);
  if (fromName?.[1]) return fromName[1];
  return "";
}

function previewFromJson(planJson: string): PreviewDay[] {
  try {
    const parsed = JSON.parse(planJson) as Array<{
      dayNumber: string | number;
      focus: string;
      notes: string;
      exercises: Array<{
        exerciseName?: string;
        exerciseId?: string;
        sets: string | number;
        reps: string;
        restSec: string | number;
        notes?: string;
      }>;
    }>;

    return parsed.map((d) => ({
      dayNumber: Number(d.dayNumber),
      focus: d.focus,
      notes: d.notes,
      exercises: (d.exercises ?? []).map((e) => ({
        exerciseName: e.exerciseName || e.exerciseId || "Exercise",
        sets: Number(e.sets || 0),
        reps: cleanReps(e.reps || ""),
        restSec: Number(e.restSec || 60),
        notes: e.notes || ""
      }))
    }));
  } catch {
    return [];
  }
}

function sortDays(days: PreviewDay[]): PreviewDay[] {
  return [...days].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
}

export function PlanEditorForm(props: Props) {
  const isTrainer = props.role === "trainer";
  const [planText, setPlanText] = useState(props.initialPlanText || "");
  const [overallNotes, setOverallNotes] = useState(props.initialOverallNotes || "");
  const [planJson, setPlanJson] = useState(props.initialPlanJson || "[]");
  const planTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastRebuiltAt, setLastRebuiltAt] = useState<string>("");

  const parsedFromSource = useMemo(() => {
    if (planText.trim()) {
      return sortDays(parseWorkoutPlanText(planText).days);
    }
    return sortDays(previewFromJson(planJson));
  }, [planText, planJson]);

  const [dayWiseDraft, setDayWiseDraft] = useState<PreviewDay[]>(parsedFromSource);
  const [editedByTrainer, setEditedByTrainer] = useState(false);
  const [editingDays, setEditingDays] = useState<Record<number, boolean>>({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    if (!editedByTrainer) {
      setDayWiseDraft(parsedFromSource);
    }
  }, [parsedFromSource, editedByTrainer]);

  const dayWiseJson = useMemo(() => JSON.stringify(dayWiseDraft), [dayWiseDraft]);

  function setDayField(dayIdx: number, key: keyof PreviewDay, value: string | number) {
    setEditedByTrainer(true);
    setDayWiseDraft((prev) =>
      prev.map((day, idx) =>
        idx === dayIdx
          ? {
              ...day,
              [key]: key === "dayNumber" ? Number(value) : String(value)
            }
          : day
      )
    );
  }

  function setExerciseField(dayIdx: number, exIdx: number, key: keyof DayExercise, value: string | number) {
    setEditedByTrainer(true);
    setDayWiseDraft((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, exI) =>
            exI === exIdx
              ? {
                  ...ex,
                  [key]: key === "sets" || key === "restSec" ? Number(value) : String(value)
                }
              : ex
          )
        };
      })
    );
  }

  function setExerciseDuration(dayIdx: number, exIdx: number, minutes: string) {
    setEditedByTrainer(true);
    setDayWiseDraft((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, exI) =>
            exI === exIdx
              ? {
                  ...ex,
                  sets: 1,
                  reps: minutes ? `${minutes} mins` : "",
                  notes: ex.notes || "cardio/conditioning"
                }
              : ex
          )
        };
      })
    );
  }

  const canSubmitTrainer = !isTrainer || dayWiseDraft.length > 0;

  function rebuildFromPlanText() {
    const livePlanText = planTextRef.current?.value ?? planText;
    const parsed = livePlanText.trim() ? parseWorkoutPlanText(livePlanText) : null;
    const rebuilt = parsed ? sortDays(parsed.days) : sortDays(previewFromJson(planJson));
    setDayWiseDraft(rebuilt);
    if (parsed) {
      setOverallNotes(parsed.globalNotes.join("\n"));
    }
    setEditedByTrainer(false);
    setEditingDays({});
    setLastRebuiltAt(new Date().toLocaleTimeString());
  }

  return (
    <form action={props.action} method="post" className="surface space-y-3 p-3 sm:p-4">
      {props.initialPlanId && <input type="hidden" name="planId" value={props.initialPlanId} />}

      <label>User</label>
      <select name="userId" defaultValue={props.initialUserId} required>
        <option value="">Select trainee</option>
        {props.users.map((u) => (
          <option key={u.userId} value={u.userId}>{u.name} ({u.mobile})</option>
        ))}
      </select>

      <label>Plan title</label>
      <input name="title" defaultValue={props.initialTitle} required />

      <label>Week start date</label>
      <input name="weekStartDate" type="date" defaultValue={props.initialWeekStartDate} required />

      <label>Status</label>
      <select name="status" defaultValue={props.initialStatus || "active"}>
        <option value="active">active</option>
        <option value="draft">draft</option>
        <option value="archived">archived</option>
      </select>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label>Plan Text</label>
        {isTrainer && (
          <button
            type="button"
            className="btn btn-secondary w-full text-xs sm:w-auto"
            onClick={() => setShowTemplateModal(true)}
          >
            View Plan Text Template
          </button>
        )}
      </div>
      <textarea
        name="planText"
        ref={planTextRef}
        rows={14}
        value={planText}
        onChange={(e) => {
          setPlanText(e.target.value);
          setEditedByTrainer(false);
        }}
        placeholder="Paste workout text in day-wise format"
        required={isTrainer}
      />

      {!isTrainer && (
        <>
          <input type="hidden" name="overallNotes" value={overallNotes} />
          <label>Plan JSON (Admin only)</label>
          <textarea name="planJson" rows={12} value={planJson} onChange={(e) => setPlanJson(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            {props.submitLabel}
          </button>
        </>
      )}

      {isTrainer && (
        <div className="rounded-xl border border-emerald-100 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Day-wise Editor</p>
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              onClick={rebuildFromPlanText}
            >
              Build from Plan Text
            </button>
          </div>
          {lastRebuiltAt && <p className="mb-2 text-xs text-zinc-500">Rebuilt from text at {lastRebuiltAt}</p>}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Overall Notes</label>
            <textarea
              name="overallNotes"
              rows={4}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="General plan-level notes (warmup, hydration, steps, safety reminders)"
            />
          </div>

          <div className="space-y-3 text-sm">
            {dayWiseDraft.map((d, dayIdx) => {
              const isEditing = Boolean(editingDays[dayIdx]);
              return (
                <div key={`${d.dayNumber}-${dayIdx}`} className="rounded border border-emerald-100 p-2">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">Day {d.dayNumber}: {d.focus}</p>
                    <button
                      type="button"
                      className="btn border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      onClick={() => setEditingDays((prev) => ({ ...prev, [dayIdx]: !prev[dayIdx] }))}
                    >
                      {isEditing ? "Close Edit" : "Edit Day"}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          value={d.dayNumber}
                          onChange={(e) => setDayField(dayIdx, "dayNumber", e.target.value)}
                          placeholder="Day number"
                        />
                        <input
                          value={d.focus}
                          onChange={(e) => setDayField(dayIdx, "focus", e.target.value)}
                          placeholder="Focus"
                        />
                      </div>
                      <div className="hidden gap-2 px-1 text-xs font-medium text-zinc-600 md:grid md:grid-cols-5">
                        <p>Exercise</p>
                        <p>Sets</p>
                        <p>Reps</p>
                        <p>Duration (mins)</p>
                        <p>Rest (sec)</p>
                      </div>
                      {d.exercises.map((ex, exIdx) => (
                        <div key={`${dayIdx}-${exIdx}`} className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 p-2 md:grid-cols-5 md:rounded-none md:border-0 md:p-0">
                          <div className="md:col-span-1">
                            <label className="text-xs text-zinc-600 md:hidden">Exercise</label>
                            <input
                              value={ex.exerciseName}
                              onChange={(e) => setExerciseField(dayIdx, exIdx, "exerciseName", e.target.value)}
                              placeholder="Exercise"
                            />
                          </div>
                          {isDurationExercise(ex) ? (
                            <>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Sets</label>
                                <input value="-" disabled className="bg-zinc-50 text-zinc-500" />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Reps</label>
                                <input value="-" disabled className="bg-zinc-50 text-zinc-500" />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Duration (mins)</label>
                                <input
                                  value={getDurationMinutes(ex)}
                                  onChange={(e) => setExerciseDuration(dayIdx, exIdx, e.target.value)}
                                  placeholder="Duration mins"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Sets</label>
                                <input
                                  value={ex.sets}
                                  onChange={(e) => setExerciseField(dayIdx, exIdx, "sets", e.target.value)}
                                  placeholder="Sets"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Reps</label>
                                <input
                                  value={ex.reps}
                                  onChange={(e) => setExerciseField(dayIdx, exIdx, "reps", cleanReps(e.target.value))}
                                  placeholder="Reps"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-600 md:hidden">Duration (mins)</label>
                                <input value="-" disabled className="bg-zinc-50 text-zinc-500" />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="text-xs text-zinc-600 md:hidden">Rest (sec)</label>
                            <input
                              value={ex.restSec}
                              onChange={(e) => setExerciseField(dayIdx, exIdx, "restSec", e.target.value)}
                              placeholder="Rest sec"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="rounded border border-emerald-100 p-2">
                        <p className="mb-2 text-xs font-semibold text-zinc-700">Notes Section</p>
                        <label className="mb-1 block text-xs text-zinc-600">Day Notes</label>
                        <textarea
                          rows={2}
                          value={d.notes}
                          onChange={(e) => setDayField(dayIdx, "notes", e.target.value)}
                          placeholder="Day-specific notes, warmup/cooldown instructions, safety reminders"
                        />
                        <div className="mt-2 space-y-2">
                          {d.exercises.map((ex, exIdx) => (
                            <div key={`${dayIdx}-note-${exIdx}`}>
                              <label className="mb-1 block text-xs text-zinc-600">{ex.exerciseName} Notes</label>
                              <input
                                value={ex.notes}
                                onChange={(e) => setExerciseField(dayIdx, exIdx, "notes", e.target.value)}
                                placeholder="Cue / caution / optional instruction"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="mt-1 list-disc pl-5">
                      {d.exercises.map((e, index) => (
                        <li key={`${d.dayNumber}-${index}`}>
                          {isDurationExercise(e)
                            ? `${e.exerciseName} • ${cleanReps(e.reps) || "duration"} • rest ${e.restSec}s`
                            : cleanReps(e.reps)
                              ? `${e.exerciseName} • ${e.sets} x ${cleanReps(e.reps)} • rest ${e.restSec}s`
                              : `${e.exerciseName} • rest ${e.restSec}s`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {!dayWiseDraft.length && <p className="text-zinc-500">No parsed days yet.</p>}
          </div>

          <div className="mt-3">
            <button
              className="btn btn-primary w-full sm:w-auto"
              type="submit"
              name="confirmPlan"
              value="true"
              disabled={!canSubmitTrainer}
            >
              Confirm and Send Plan to User
            </button>
          </div>
        </div>
      )}

      {isTrainer && <input type="hidden" name="planJson" value="[]" />}
      {isTrainer && <input type="hidden" name="dayWiseJson" value={dayWiseJson} />}

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl sm:p-5">
            <h3 className="text-base font-semibold">Plan Text Template</h3>
            <p className="mb-3 mt-1 text-sm text-zinc-600">Use this structure when pasting workout plans.</p>
            <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              {PLAN_TEXT_TEMPLATE}
            </pre>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-muted" onClick={() => setShowTemplateModal(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPlanText(PLAN_TEXT_TEMPLATE);
                  setShowTemplateModal(false);
                }}
              >
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
