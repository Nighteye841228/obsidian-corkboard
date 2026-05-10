import type { CorkboardSettings } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

export function mergeSettings(loaded: Partial<CorkboardSettings> | null): CorkboardSettings {
	if (!loaded) return { ...DEFAULT_SETTINGS, statusLabels: { ...DEFAULT_SETTINGS.statusLabels } };
	return {
		statusLabels: {
			...DEFAULT_SETTINGS.statusLabels,
			...(loaded.statusLabels ?? {}),
		},
	};
}
