export type RenderContext = {
	enhancements: Set<string>;
	functions?: {
		idByReference: WeakMap<Function, string>;
		referenceById: Map<string, Function>;
	};
};
