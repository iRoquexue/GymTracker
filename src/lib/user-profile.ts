export type LocalUserProfile = {
  displayName: string;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  goalWeightKg: number | null;
  objective: string;
  dailyKcalGoal: number | null;
  dailyWaterGoalMl: number | null;
  avatarDataUrl: string | null;
};

const STORAGE_PREFIX = "gymtracker.user-profile";

export const emptyLocalUserProfile: LocalUserProfile = {
  displayName: "",
  age: null,
  weightKg: null,
  heightCm: null,
  goalWeightKg: null,
  objective: "",
  dailyKcalGoal: null,
  dailyWaterGoalMl: null,
  avatarDataUrl: null,
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}.${userId}`;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getLocalUserProfile(userId: string): LocalUserProfile {
  if (typeof window === "undefined") return emptyLocalUserProfile;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyLocalUserProfile;
    const parsed = JSON.parse(raw) as Partial<LocalUserProfile>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      age: asNumber(parsed.age),
      weightKg: asNumber(parsed.weightKg),
      heightCm: asNumber(parsed.heightCm),
      goalWeightKg: asNumber(parsed.goalWeightKg),
      objective: typeof parsed.objective === "string" ? parsed.objective : "",
      dailyKcalGoal: asNumber(parsed.dailyKcalGoal),
      dailyWaterGoalMl: asNumber(parsed.dailyWaterGoalMl),
      avatarDataUrl: typeof parsed.avatarDataUrl === "string" ? parsed.avatarDataUrl : null,
    };
  } catch {
    return emptyLocalUserProfile;
  }
}

export function saveLocalUserProfile(userId: string, profile: LocalUserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(profile));
}

export function getProfileInitials(name: string, email?: string | null) {
  const source = name.trim() || email?.split("@")[0] || "GT";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
