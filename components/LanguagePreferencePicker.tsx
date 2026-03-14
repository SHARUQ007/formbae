import { LANGUAGE_OPTIONS } from "@/lib/profile-form-options";

type Props = {
  selectedLanguages: string[];
};

export function LanguagePreferencePicker({ selectedLanguages }: Props) {
  return (
    <div className="md:col-span-2">
      <label>Language Preferences</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {LANGUAGE_OPTIONS.map((language) => (
          <label key={language} className="mb-0 cursor-pointer">
            <input
              type="checkbox"
              name="languagePreferences"
              value={language}
              defaultChecked={selectedLanguages.includes(language)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-2 py-2 text-center text-sm text-zinc-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:font-semibold">
              {language}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500">Select one or more languages.</p>
    </div>
  );
}
