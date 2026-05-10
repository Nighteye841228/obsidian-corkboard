export interface SynopsisEditorProps {
	value: string;
	onCommit: (text: string) => void;
}

export function SynopsisEditor(props: SynopsisEditorProps) {
	return <div class="corkboard-synopsis">{props.value}</div>;
}
