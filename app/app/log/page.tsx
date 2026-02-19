import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { getPlanForUser } from "@/lib/services/plans";

export default async function LogPage() {
  const user = await requireUser("user");
  const plan = await getPlanForUser(user.userId);

  if (!plan || !plan.days.length) return <p>No plan available.</p>;
  const day = plan.days[0];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <SectionTitle title="Log Workout" subtitle="Track reps, weight, RPE and pain" />
      <form action="/api/workouts/log" method="post" className="surface space-y-3 p-4">
        <input type="hidden" name="planId" value={plan.planId} />
        <input type="hidden" name="planDayId" value={day.planDayId} />
        <label>Date</label>
        <input name="date" type="date" required />
        <label>Notes</label>
        <textarea name="notes" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-800">Exercises</p>
          {day.exercises.map((e, idx) => (
            <div key={`${e.exerciseId}-${idx}`} className="rounded-xl border border-emerald-100 p-3">
              <input type="hidden" name="exerciseId" value={e.exerciseId} />
              <input type="hidden" name="setNumber" value="1" />
              <p className="mb-2 text-sm font-medium text-zinc-900">{e.exerciseName}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label>Reps</label>
                  <input name="reps" type="number" min="0" placeholder="e.g. 10" />
                </div>
                <div>
                  <label>Weight</label>
                  <input name="weight" type="number" min="0" step="0.5" placeholder="kg" />
                </div>
                <div>
                  <label>RPE</label>
                  <input name="rpe" type="number" min="1" max="10" placeholder="1-10" />
                </div>
                <div>
                  <label>Pain</label>
                  <select name="painFlag" defaultValue="false">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary w-full" type="submit">Save Log</button>
      </form>
    </div>
  );
}
