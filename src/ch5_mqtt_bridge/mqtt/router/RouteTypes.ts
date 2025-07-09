
export type RouteCallback = (topic: string, message: any, params?: Record<string, string>) => void;

export type RouteUnsubscribeCallback = () => void;

export enum RouteResult {
    HandledStop,
    HandledContinue,
    NoMatch
}