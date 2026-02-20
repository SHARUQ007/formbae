import { ExerciseLibraryList } from "@/components/ExerciseLibraryList";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";

export default async function ExercisesPage() {
  await requireUser("trainer");
  const [exercises, videos] = await Promise.all([repo.readExercises(), repo.readVideos()]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-4 sm:px-0">
      <SectionTitle title="Exercise Library" subtitle="Manage default cues and fallback video links." />
      <form action="/api/trainer/exercises" method="post" className="surface space-y-3 p-3 sm:p-4">
        <label>Exercise Name</label>
        <input name="name" required />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label>Primary Muscle</label>
            <input name="primaryMuscle" required />
          </div>
          <div>
            <label>Equipment</label>
            <input name="equipment" required />
          </div>
        </div>
        <label>3 Key Cues (one per line)</label>
        <textarea
          name="cuesText"
          defaultValue={`Stable setup\nControlled reps\nFull range`}
          rows={4}
          required
        />
        <label>3 Common Mistakes (one per line)</label>
        <textarea
          name="mistakesText"
          defaultValue={`Rounded back\nJerky movement\nHolding breath`}
          rows={4}
          required
        />
        <label>Safety Note</label>
        <input
          name="safetyText"
          defaultValue="Stop if sharp pain appears"
          required
        />
        <label>Manual Video URL (optional fallback)</label>
        <input name="manualVideoUrl" placeholder="https://youtube.com/shorts/..." />
        <button className="btn btn-primary w-full" type="submit">Add Exercise</button>
      </form>
      <ExerciseLibraryList exercises={exercises} videos={videos} />
    </div>
  );
}
