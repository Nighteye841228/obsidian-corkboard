export type StatusId = "todo" | "draft" | "revision" | "done";

export type ColorKey =
	| "red" | "orange" | "yellow" | "green"
	| "blue" | "purple" | "pink" | "gray";

export interface CorkboardCard {
	path: string;
	synopsis: string;
	status: StatusId;
	color: ColorKey | null;
}

export interface CorkboardData {
	version: 1;
	cardWidth: number;
	cardHeight: number;
	cards: CorkboardCard[];
}

export interface CorkboardSettings {
	statusLabels: Record<StatusId, string>;
}
