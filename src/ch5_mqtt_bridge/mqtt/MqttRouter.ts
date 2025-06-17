import {RouteEntry} from "./router/RouteEntry.ts";
import {RouteResult} from "./router/RouteTypes.ts";

export class MqttRouter {
    private _routes: RouteEntry[] = [];

    public registerRoute(topic: string, handler: RouteHandler) {
        this._routes.push(new RouteEntry(topic, handler));
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