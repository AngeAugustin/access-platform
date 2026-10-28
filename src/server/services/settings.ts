import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export type Settings = { -readonly [K in keyof typeof DEFAULT_SETTINGS]: number };

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) {
      const value = Number(row.value);
      if (Number.isFinite(value)) settings[row.key as keyof Settings] = value;
    }
  }
  return settings;
}

export async function saveSettings(settings: Settings) {
  await db.$transaction(
    Object.entries(settings).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } }),
    ),
  );
}
