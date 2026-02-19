import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const user = await requireUser("user");
  const params = await searchParams;
  const profile = (await repo.readProfiles()).find((p) => p.userId === user.userId);

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
          <label>Diet Preference</label>
          <input name="dietPref" defaultValue={profile?.dietPref} placeholder="veg / non-veg / mixed" />
        </div>
        <div className="md:col-span-2">
          <label>Training Days (/week)</label>
          <input name="trainingDays" defaultValue={profile?.trainingDays} placeholder="e.g. 4" />
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
