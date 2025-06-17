import {injectable, inject} from "inversify";

import Ch5MqttClient from "../mqtt/MqttClient.ts";

import {TSignalNonStandardTypeName} from "@crestron/ch5-crcomlib/build_bundles/umd/@types/ch5-core/types/core";
import {SignalRegistrationRecord} from "../interop/CrestronTypes.ts";

@injectable("Singleton")
export class JoinProxyService {

    private _mqttClient: Ch5MqttClient;
    private _subscribedSignals: SignalRegistrationRecord[] = [];

    private constructor(@inject(Ch5MqttClient) mqttClient: Ch5MqttClient) {
        this._mqttClient = mqttClient;

        this._mqttClient.connectCallback(() => {
            this._prepopulateSignals();
        });
    }

    public subscribeSignal(signalType: TSignalNonStandardTypeName, signalName: string): void {
        let subId = window.CrComLib.subscribeState(signalType, signalName, (signalValue: any) => {
            this._mqttClient.sendMessage(`joins/${signalType}/${signalName}`, signalValue);
        });

        this._subscribedSignals.push({signalType: signalType, signalName: signalName, subscriptionId: subId});
    }

    public dispose(): void {
        this._subscribedSignals.forEach(s => {
            window.CrComLib.unsubscribeState(s.signalType, s.signalName, s.subscriptionId);
        });
        this._subscribedSignals = [];
    }

    private _prepopulateSignals(): void {
        const subscriptions = window.CrComLib.getSubscriptionsCount();
        Object.values(subscriptions).forEach(bag => {
            Object.values(bag).forEach(signal => {
                if (!this._subscribedSignals.some(s => s.signalName === signal.name)) {
                    this.subscribeSignal(signal.type, signal.name);
                } else {
                    console.warn(`[JoinProxyService] Signal ${signal.type}/${signal.name} already subscribed!`);
                }
            });
        });
    }
}