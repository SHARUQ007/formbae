import { AvatarIcon } from "@/components/AvatarIcon";
import { AVATAR_ICON_IDS, AVATAR_ICON_META } from "@/lib/avatar-icons";

type Props = {
  selectedAvatar: string;
  required?: boolean;
  label?: string;
};

export function ProfileAvatarPicker({
  selectedAvatar,
  required = false,
  label = "Profile Icon"
}: Props) {
  return (
    <div className="md:col-span-2">
      <label>{label}</label>
      <div className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {AVATAR_ICON_IDS.map((iconId) => (
          <label key={iconId} className="mb-0 h-full cursor-pointer">
            <input
              type="radio"
              name="avatarIcon"
              value={iconId}
              defaultChecked={selectedAvatar === iconId}
              className="peer sr-only"
              required={required}
            />
            <span className="flex h-full w-full flex-col items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-center peer-checked:border-emerald-500 peer-checked:bg-emerald-50">
              <AvatarIcon iconId={iconId} className="h-6 w-6 text-emerald-700" />
              <span className="block min-h-8 text-sm font-semibold leading-tight text-zinc-800">{AVATAR_ICON_META[iconId].name}</span>
              <span className="block min-h-10 text-xs leading-snug text-zinc-600">{AVATAR_ICON_META[iconId].tagline}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
