import {Container} from "inversify";

import {TouchEventService} from "./services/TouchEventService.ts";
import {JoinProxyService} from "./services/JoinProxyService.ts";
import { LedAccessoryController } from "./interop/controllers/LedAccessoryController.ts";
import Ch5MqttClient from "./mqtt/MqttClient.ts";
import {HardButtonController} from "./interop/controllers/HardButtonController.ts";
import {LedAccessoryService} from "./services/LedAccessoryService.ts";

export class Ch5MqttBridge {
    private _diContainer: Container = new Container();

    private _joinProxyService: JoinProxyService | undefined;
    private _touchEventService: TouchEventService | undefined;
    private _ledAccessoryService: LedAccessoryService | undefined;

    private constructor() {
        this._diContainer.bind(Ch5MqttClient).toSelf().inSingletonScope();

        this._diContainer.bind(HardButtonController).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryController).toSelf().inSingletonScope();

        this._diContainer.bind(JoinProxyService).toSelf().inSingletonScope();
        this._diContainer.bind(TouchEventService).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryService).toSelf().inSingletonScope();
    }

    public start() {
        // initialize a new service
        this._joinProxyService = this._diContainer.get(JoinProxyService);
        this._touchEventService = this._diContainer.get(TouchEventService);
        this._ledAccessoryService = this._diContainer.get(LedAccessoryService);
    }
}