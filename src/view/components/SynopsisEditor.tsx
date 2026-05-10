import { useEffect, useRef, useState } from "preact/hooks";

export interface SynopsisEditorProps {
	value: string;
	onCommit: (text: string) => void;
}

export function SynopsisEditor(props: SynopsisEditorProps) {
	const [text, setText] = useState(props.value);
	const lastExternal = useRef(props.value);

	useEffect(() => {
		if (props.value !== lastExternal.current) {
			setText(props.value);
			lastExternal.current = props.value;
		}
	}, [props.value]);

	const cancel = () => {
		setText(lastExternal.current);
	};

	const commitIfChanged = () => {
		if (text !== lastExternal.current) {
			lastExternal.current = text;
			props.onCommit(text);
		}
	};

	return (
		<textarea
			class="corkboard-synopsis"
			value={text}
			onInput={(e: Event) => setText((e.currentTarget as HTMLTextAreaElement).value)}
			onBlur={commitIfChanged}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === "Escape") {
					e.preventDefault();
					cancel();
					(e.target as HTMLTextAreaElement).blur();
				}
			}}
		/>
	);
}
