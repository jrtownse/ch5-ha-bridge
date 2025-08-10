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
import {RouteCallback, RouteUnsubscribeCallback} from "./mqtt/router/RouteTypes.ts";
import {IClientPublishOptions} from "mqtt/lib/client";
import {DeviceInfo} from "./interop/DeviceInfo.ts";
import JoinControl from "./interop/JoinControl.ts";

export class Ch5MqttBridge {
    private _diContainer: Container = new Container();

    public ch5MqttConnector: Ch5MqttConnector;

    public joinProxyService: JoinProxyService | undefined;
    public touchEventService: HardButtonService | undefined;
    public ledAccessoryService: LedAccessoryService | undefined;

    public powerButtonBehavior: PowerButtonBehavior | undefined;

    constructor() {
        this._diContainer.bind(Ch5MqttConnector).toSelf().inSingletonScope();
        this.ch5MqttConnector = this._diContainer.get(Ch5MqttConnector);

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

    public async start() {
        await JoinControl.syncJoinStates();

        console.log("[Ch5MqttBridge] State synchronized successfully, booting app...");

        this.ch5MqttConnector.setBaseTopic(`crestron/ch5_mqtt/${DeviceInfo.getModelNumber()}_${DeviceInfo.getTSID()}`);
        this.loadServices();
    }

    public loadServices() {
        // initialize a new service
        this.joinProxyService = this._diContainer.get(JoinProxyService);
        this.touchEventService = this._diContainer.get(HardButtonService);
        this.ledAccessoryService = this._diContainer.get(LedAccessoryService);

        this.powerButtonBehavior = this._diContainer.get(PowerButtonBehavior);
    }

    public subscribeMessage(topicSpec: string, handler: RouteCallback): RouteUnsubscribeCallback {
        return this.ch5MqttConnector.registerRoute(topicSpec, handler);
    }

    public sendMessage(topic: string, message: object, args?: IClientPublishOptions) {
        this.ch5MqttConnector.sendMessage(topic, message, args);
    }
}