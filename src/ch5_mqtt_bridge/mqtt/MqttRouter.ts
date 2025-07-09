import {RouteEntry} from "./router/RouteEntry.ts";
import {RouteCallback, RouteResult, RouteUnsubscribeCallback} from "./router/RouteTypes.ts";

export class MqttRouter {
    private _routes: RouteEntry[] = [];

    public registerRoute(topic: string, handler: RouteCallback): RouteUnsubscribeCallback {
        const route = new RouteEntry(topic, handler);
        this._routes.push(route);

        return () => {
            const idx = this._routes.indexOf(route);
            this._routes.splice(idx);
        };
    }

    public handleMessage(topic: string, message: any) {
        let wasRouted = false;
        for (const route of this._routes) {
            const result = route.tryHandle(topic, message);
            if (result === RouteResult.HandledStop) {
                return;
            } else if (result === RouteResult.HandledContinue) {
                wasRouted = true;
            }
        }

        if (!wasRouted) {
            console.warn(`No route matched for topic: ${topic}`);
        }
    }
}