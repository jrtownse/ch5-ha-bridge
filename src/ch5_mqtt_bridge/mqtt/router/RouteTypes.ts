
export type RouteCallback = (topic: string, message: any, params?: Record<string, string>) => void;

export enum RouteResult {
    HandledStop,
    HandledContinue,
    NoMatch
}