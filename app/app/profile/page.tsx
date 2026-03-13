import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Spanish",
  "French",
  "German",
  "Arabic"
];

function parseLanguages(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
  } catch {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTrainingDays(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  const n = Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 7) return String(n);
  return "";
}

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const user = await requireUser("user");
  const params = await searchParams;
  const profile = (await repo.readProfiles()).find((p) => p.userId === user.userId);
  const selectedLanguages = parseLanguages(profile?.languagePreferencesJson);
  const trainingDaysValue = normalizeTrainingDays(profile?.trainingDays);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <SectionTitle title="Profile" subtitle="Add or edit your basic details" />
      {params.updated === "1" && <p className="alert-success">Profile updated.</p>}
      <form action="/api/trainer/users" method="post" className="surface grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        <input type="hidden" name="mode" value="profile" />
        <input type="hidden" name="userId" value={user.userId} />

        <div>
          <label>Weight (kg)</label>
          <input name="weight" defaultValue={profile?.weight} placeholder="e.g. 70" />
        </div>
        <div>
          <label>Height (cm)</label>
          <input name="height" defaultValue={profile?.height} placeholder="e.g. 172" />
        </div>
        <div>
          <label>Age</label>
          <input name="age" defaultValue={profile?.age} placeholder="e.g. 26" />
        </div>
        <div>
          <label>Gender</label>
          <select name="gender" defaultValue={profile?.gender || ""} className="pr-10">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label>Diet Preference</label>
          <input name="dietPref" defaultValue={profile?.dietPref} placeholder="veg / non-veg / mixed" />
        </div>
        <div>
          <label>Training Days (/week)</label>
          <select name="trainingDays" defaultValue={trainingDaysValue} className="pr-10">
            <option value="">Select days per week</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label>Language Preferences</label>
          <select
            name="languagePreferences"
            multiple
            size={Math.min(8, LANGUAGE_OPTIONS.length)}
            defaultValue={selectedLanguages}
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">Hold Cmd/Ctrl to select multiple languages.</p>
        </div>

        <input type="hidden" name="chest" value={profile?.chest ?? ""} />
        <input type="hidden" name="waist" value={profile?.waist ?? ""} />
        <input type="hidden" name="biceps" value={profile?.biceps ?? ""} />
        <input type="hidden" name="allergies" value={profile?.allergies ?? ""} />
        <input type="hidden" name="lifestyleJson" value={profile?.lifestyleJson || "{}"} />
        <input type="hidden" name="photosUrlsJson" value={profile?.photosUrlsJson || "{}"} />

        <button className="btn btn-primary w-full md:col-span-2" type="submit">
          Save Profile
        </button>
      </form>
    </div>
  );
}
