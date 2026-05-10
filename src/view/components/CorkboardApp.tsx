import type { CorkboardController } from "../../state/controller";
import type { SelectionStore } from "../../state/selectionStore";
import type { DragStore } from "../../state/dragStore";

export interface CorkboardAppProps {
	controller: CorkboardController;
	selectionStore: SelectionStore;
	dragStore: DragStore;
	openMd: (path: string) => void;
}

export function CorkboardApp(_props: CorkboardAppProps) {
	return <div className="corkboard-app">corkboard placeholder</div>;
}
