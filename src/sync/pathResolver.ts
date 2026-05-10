import { CORKBOARD_FILE_NAME } from "../constants";

export function folderOf(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? "" : path.slice(0, i);
}

export function corkboardPathFor(mdPath: string): string {
	const folder = folderOf(mdPath);
	return folder === "" ? CORKBOARD_FILE_NAME : `${folder}/${CORKBOARD_FILE_NAME}`;
}

export function isMarkdown(path: string): boolean {
	return /\.md$/i.test(path);
}

export function isCorkboard(path: string): boolean {
	const i = path.lastIndexOf("/");
	const name = i === -1 ? path : path.slice(i + 1);
	return name === CORKBOARD_FILE_NAME;
}
