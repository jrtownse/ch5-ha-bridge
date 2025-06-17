import {RouteCallback, RouteResult} from "./RouteTypes.ts";

export class RouteEntry {

    private _routeRegex: RegExp;
    private _handler: RouteCallback;
    private _isFinalRoute: boolean;

    constructor(topicSpec: string, handler: RouteCallback, isFinalRoute: boolean = false) {
        this._routeRegex = this._assembleRouteRegex(topicSpec);
        this._handler = handler;
        this._isFinalRoute = isFinalRoute;
    }

    public tryHandle(topic: string, message: any): RouteResult {
        const match = this._routeRegex.exec(topic);
        if (match) {
            const params: Record<string, string> = {};
            for (const key in match.groups) {
                params[key] = match.groups[key];
            }
            this._handler(topic, message, params);
            return this._isFinalRoute ? RouteResult.HandledStop : RouteResult.HandledContinue;
        }

        return RouteResult.NoMatch;
    }

    private _assembleRouteRegex(topic: string): RegExp {
        const topicParts = topic.split('/');

        const regexParts = topicParts.map(part => {
            if (part === '#') {
                return '.*';
            } else if (part === '+') {
                return '[^/]+';
            } else if (part.startsWith(":")) {
                let partName = part.replace(":", "");
                return `(?<${partName}>[^/]+)`;
            } else {
                return part.replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            }
        });

        return new RegExp(`^${regexParts.join('/')}$`);
    }
}