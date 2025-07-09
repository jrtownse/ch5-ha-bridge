export default class ResolvablePromiseSource<T> {
    public readonly promise: Promise<T>;

    private _resolveInner: ((value: T) => void) | undefined;
    private _rejectInner: ((value: T) => void) | undefined;

    private _completionState : false | "resolved" | "rejected" = false;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this._resolveInner = resolve;
            this._rejectInner = reject;
        })
    }

    public resolve(value: T) {
        this._resolveInner?.call(this, value);
        this._completionState = "resolved";
    }

    public reject(value: T) {
        this._rejectInner?.call(this, value);
        this._completionState = "rejected";
    }

    public isCompleted() { return !!this._completionState; }

    public isResolved() { return this._completionState == "resolved"; }

    public isRejected() { return this._completionState == "rejected"; }
}