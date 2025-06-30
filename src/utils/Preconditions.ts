export function checkArgument(expression: boolean, errorMessage?: string): void {
    if (!expression) {
        throw new Error(errorMessage || "Illegal argument");
    }
}

export function checkState(expression: boolean, errorMessage?: string): void {
    if (!expression) {
        throw new Error(errorMessage || "Illegal state");
    }
}

export function checkNotNull<T>(reference: T | null | undefined, errorMessage?: string): T {
    if (reference === null || reference === undefined) {
        throw new Error(errorMessage || "Null pointer");
    }
    return reference;
}
