import type { CorkboardData } from "../types";
import { DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from "../constants";

/**
 * Build a fresh CorkboardData populated with one card per markdown path.
 * Used when (a) creating a new corkboard for an existing folder, or
 * (b) resetting a corrupt corkboard — both want to capture the folder's
 * current md files instead of starting empty.
 *
 * Card order matches the order of `mdPaths`.
 */
export function buildInitialData(mdPaths: string[]): CorkboardData {
	return {
		version: 1,
		cardWidth: DEFAULT_CARD_WIDTH,
		cardHeight: DEFAULT_CARD_HEIGHT,
		cards: mdPaths.map(path => ({
			path,
			synopsis: "",
			status: "todo",
			color: null,
		})),
	};
}

export function serializeInitialData(mdPaths: string[]): string {
	return JSON.stringify(buildInitialData(mdPaths), null, 2);
}
