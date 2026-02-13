import { cookies } from "next/headers";
import { translations, type Language } from "@/lib/i18n";

export async function getServerLanguage(): Promise<Language> {
  const value = (await cookies()).get("cp_lang")?.value;
  return value === "bg" ? "bg" : "en";
}

export async function getServerTranslations() {
  return translations[await getServerLanguage()];
}
