import type { ColorKey, StatusId, CorkboardSettings } from "./types";

export const VIEW_TYPE_CORKBOARD = "corkboard";
export const FILE_EXT_CORKBOARD = "corkboard";
export const CORKBOARD_FILE_NAME = "index.corkboard";

export const DEFAULT_CARD_WIDTH = 280;
export const DEFAULT_CARD_HEIGHT = 180;
export const MIN_CARD_WIDTH = 160;
export const MIN_CARD_HEIGHT = 120;
export const MAX_CARD_WIDTH = 480;
export const MAX_CARD_HEIGHT = 320;

export const STATUS_IDS: StatusId[] = ["todo", "draft", "revision", "done"];

export const COLOR_PALETTE: ColorKey[] = [
	"red", "orange", "yellow", "green",
	"blue", "purple", "pink", "gray",
];

export const COLOR_HEX: Record<ColorKey, string> = {
	red:    "#e57373",
	orange: "#ffb74d",
	yellow: "#fff176",
	green:  "#81c784",
	blue:   "#64b5f6",
	purple: "#ba68c8",
	pink:   "#f48fb1",
	gray:   "#bdbdbd",
};

export const DEFAULT_SETTINGS: CorkboardSettings = {
	statusLabels: {
		todo: "Todo",
		draft: "Draft",
		revision: "Revision",
		done: "Done",
	},
};
