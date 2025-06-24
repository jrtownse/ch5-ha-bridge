import {Container} from "inversify";

import {HardButtonService} from "./services/HardButtonService.ts";
import {JoinProxyService} from "./services/JoinProxyService.ts";
import {LedAccessoryController} from "./interop/controllers/LedAccessoryController.ts";
import Ch5MqttConnector from "./mqtt/MqttClient.ts";
import {HardButtonController} from "./interop/controllers/HardButtonController.ts";
import {LedAccessoryService} from "./services/LedAccessoryService.ts";
import {PowerButtonBehavior} from "./behaviors/PowerButtonBehavior.ts";
import {DisplayController} from "./interop/controllers/DisplayController.ts";
import {AmbientLightController} from "./interop/controllers/AmbientLightController.ts";
import {SipController} from "./interop/controllers/SipController.ts";

export class Ch5MqttBridge {
    private _diContainer: Container = new Container();

    private _initialized: boolean = false;

    public joinProxyService: JoinProxyService | undefined;
    public touchEventService: HardButtonService | undefined;
    public ledAccessoryService: LedAccessoryService | undefined;

    public powerButtonBehavior: PowerButtonBehavior | undefined;

    constructor() {
        this._diContainer.bind(Ch5MqttConnector).toSelf().inSingletonScope();

        this._diContainer.bind(AmbientLightController).toSelf().inSingletonScope();
        this._diContainer.bind(DisplayController).toSelf().inSingletonScope();
        this._diContainer.bind(HardButtonController).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryController).toSelf().inSingletonScope();
        this._diContainer.bind(SipController).toSelf().inSingletonScope();

        this._diContainer.bind(HardButtonService).toSelf().inSingletonScope();
        this._diContainer.bind(JoinProxyService).toSelf().inSingletonScope();
        this._diContainer.bind(LedAccessoryService).toSelf().inSingletonScope();

        this._diContainer.bind(PowerButtonBehavior).toSelf().inSingletonScope();
    }

    public start() {
        // request a full copy of state as soon as possible, canary on some random very-late signal
        window.CrComLib.subscribeState("s", "Csig.fb33331", (canary: string) => {
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
        this.joinProxyService = this._diContainer.get(JoinProxyService);
        this.touchEventService = this._diContainer.get(HardButtonService);
        this.ledAccessoryService = this._diContainer.get(LedAccessoryService);

        this.powerButtonBehavior = this._diContainer.get(PowerButtonBehavior);
    }
}