import { LanguagePreferencePicker } from "@/components/LanguagePreferencePicker";
import { ProfileAvatarPicker } from "@/components/ProfileAvatarPicker";
import { SectionTitle } from "@/components/SectionTitle";
import { DEFAULT_AVATAR_ICON_ID } from "@/lib/avatar-icons";
import { requireUser } from "@/lib/auth/guard";
import { normalizeTrainingDays } from "@/lib/profile-form-options";
import { repo } from "@/lib/repo/sheets-repo";
import { parseLanguages } from "@/lib/services/profile-onboarding";

export default async function OnboardingPage() {
  const user = await requireUser("user", { allowIncompleteProfile: true });
  const profile = (await repo.readProfiles()).find((p) => p.userId === user.userId);
  const selectedLanguages = parseLanguages(profile?.languagePreferencesJson);
  const trainingDaysValue = normalizeTrainingDays(profile?.trainingDays);
  const selectedAvatar = profile?.avatarIcon || DEFAULT_AVATAR_ICON_ID;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-4 sm:px-0">
      <SectionTitle title="Complete Your Profile" subtitle="One-time setup before you start your plan" />
      <form action="/api/trainer/users" method="post" className="surface grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-2">
        <input type="hidden" name="mode" value="profile" />
        <input type="hidden" name="userId" value={user.userId} />
        <input type="hidden" name="returnTo" value="/app/today?onboarded=1" />

        <ProfileAvatarPicker selectedAvatar={selectedAvatar} label="Choose Your Profile Icon" required />

        <div>
          <label>Weight (kg)</label>
          <input name="weight" defaultValue={profile?.weight} placeholder="e.g. 70" required />
        </div>
        <div>
          <label>Height (cm)</label>
          <input name="height" defaultValue={profile?.height} placeholder="e.g. 172" required />
        </div>
        <div>
          <label>Age</label>
          <input name="age" defaultValue={profile?.age} placeholder="e.g. 26" required />
        </div>
        <div>
          <label>Gender</label>
          <select name="gender" defaultValue={profile?.gender || ""} className="pr-10" required>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label>Diet Preference</label>
          <input name="dietPref" defaultValue={profile?.dietPref} placeholder="veg / non-veg / mixed" required />
        </div>
        <div className="md:col-span-2">
          <label>Fitness Goal</label>
          <textarea
            name="fitnessGoal"
            defaultValue={profile?.fitnessGoal}
            placeholder="e.g. Lose fat, improve stamina, and build lean muscle over the next 4 months."
            rows={3}
            required
          />
        </div>
        <div>
          <label>Training Days (/week)</label>
          <select name="trainingDays" defaultValue={trainingDaysValue} className="pr-10" required>
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

        <LanguagePreferencePicker selectedLanguages={selectedLanguages} />

        <input type="hidden" name="chest" value={profile?.chest ?? ""} />
        <input type="hidden" name="waist" value={profile?.waist ?? ""} />
        <input type="hidden" name="biceps" value={profile?.biceps ?? ""} />
        <input type="hidden" name="allergies" value={profile?.allergies ?? ""} />
        <input type="hidden" name="lifestyleJson" value={profile?.lifestyleJson || "{}"} />
        <input type="hidden" name="photosUrlsJson" value={profile?.photosUrlsJson || "{}"} />

        <button className="btn btn-primary w-full md:col-span-2" type="submit">
          Finish Onboarding
        </button>
      </form>
    </div>
  );
}
