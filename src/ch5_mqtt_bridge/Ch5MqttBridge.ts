import {Container} from "inversify";

import {HardButtonService} from "./services/HardButtonService.ts";
import {JoinProxyService} from "./services/JoinProxyService.ts";
import { LedAccessoryController } from "./interop/controllers/LedAccessoryController.ts";
import Ch5MqttClient from "./mqtt/MqttClient.ts";
import {HardButtonController} from "./interop/controllers/HardButtonController.ts";
import {LedAccessoryService} from "./services/LedAccessoryService.ts";

export class Ch5MqttBridge {
    private _diContainer: Container = new Container();

    private _initialized: boolean = false;

    private _joinProxyService: JoinProxyService | undefined;
    private _touchEventService: HardButtonService | undefined;
    private _ledAccessoryService: LedAccessoryService | undefined;

    private constructor() {
        this._diContainer.bind(Ch5MqttClient).toSelf().inSingletonScope();

        this._diContainer.bind(HardButtonController).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryController).toSelf().inSingletonScope();

        this._diContainer.bind(JoinProxyService).toSelf().inSingletonScope();
        this._diContainer.bind(HardButtonService).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryService).toSelf().inSingletonScope();
    }

    public start() {
        // request a full copy of state as soon as possible, canary on some random very-late signal
        window.CrComLib.subscribeState("s", "Csig.fb33331", (canary) => {
            if (this._initialized) {
                return;
            }

            if (canary != "") {
                console.log("[Ch5MqttBridge] State synchronized successfully, booting app...");
                this._initialized = true;

                this.loadServices();
            }
        });

        window.CrComLib.publishEvent("object", "Csig.State_Synchronization", {});
    }

    public loadServices() {
        // initialize a new service
        this._joinProxyService = this._diContainer.get(JoinProxyService);
        this._touchEventService = this._diContainer.get(HardButtonService);
        this._ledAccessoryService = this._diContainer.get(LedAccessoryService);
    }
}