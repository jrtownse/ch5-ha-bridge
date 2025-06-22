import {injectable, inject} from "inversify";

import Ch5MqttConnector from "../mqtt/MqttClient.ts";

import {TSignalNonStandardTypeName} from "@crestron/ch5-crcomlib/build_bundles/umd/@types/ch5-core/types/core";
import {SignalRegistrationRecord} from "../interop/CrestronTypes.ts";

@injectable("Singleton")
export class JoinProxyService {

    private _mqttClient: Ch5MqttConnector;
    private _subscribedSignals: SignalRegistrationRecord[] = [];

    private constructor(@inject(Ch5MqttConnector) mqttClient: Ch5MqttConnector) {
        this._mqttClient = mqttClient;

        this._mqttClient.connectCallback(() => {
            this._prepopulateSignals();
        });

        this._mqttClient.registerRoute("joins/_subscribeAll", this.subscribeAllSignals.bind(this));
        this._mqttClient.registerRoute("joins/:type/:name", this.writeSignal.bind(this));
        this._mqttClient.registerRoute("joins/:type/:name/_subscribe", this.subscribeSignal.bind(this));
        this._mqttClient.registerRoute("joins/:type/:name/_unsubscribe", this.unsubscribeSignal.bind(this));

    }

    public subscribeSignal(topic: string, message: any, params?: Record<string, string>): void {
        if (!params || !params.type || !params.name) {
            console.error(`[JoinProxyService] Invalid topic format: ${topic}`);
            return;
        }

        this._subscribeSignalInner(params.type as TSignalNonStandardTypeName, params.name);
    }

    public unsubscribeSignal(topic: string, message: any, params?: Record<string, string>): void {
        if (!params || !params.type || !params.name) {
            console.error(`[JoinProxyService] Invalid topic format: ${topic}`);
            return;
        }

        const signalType = params.type as TSignalNonStandardTypeName;
        const signalName = params.name;

        this._unsubscribeSignalInner(signalType, signalName);
    }

    public writeSignal(topic: string, message: any, params?: Record<string, string>): void {
        if (!params || !params.type || !params.name) {
            console.error(`[JoinProxyService] Invalid topic format: ${topic}`);
            return;
        }

        const signalType = params.type as TSignalNonStandardTypeName;
        const signalName = params.name;

        window.CrComLib.publishEvent(signalType, signalName, message);
    }

    public subscribeAllSignals(topic: string, message: any, params?: Record<string, string>): void {
        const subscriptions = window.CrComLib.getSubscriptionsCount();
        Object.values(subscriptions).forEach(bag => {
            Object.values(bag).forEach(signal => {
                this._subscribeSignalInner(signal.type, signal.name);
            });
        });
    }

    public dispose(): void {
        this._subscribedSignals.forEach(s => {
            window.CrComLib.unsubscribeState(s.signalType, s.signalName, s.subscriptionId);
        });
        this._subscribedSignals = [];
    }

    private _subscribeSignalInner(signalType: TSignalNonStandardTypeName, signalName: string): boolean {
        if (this._subscribedSignals.some(s => s.signalName === signalName)) {
            return false;
        }

        let subId = window.CrComLib.subscribeState(signalType, signalName, (signalValue: any) => {
            this._mqttClient.sendMessage(`joins/${signalType}/${signalName}`, signalValue);
        });

        this._subscribedSignals.push({signalType: signalType, signalName: signalName, subscriptionId: subId});

        return true;
    }

    private _unsubscribeSignalInner(signalType: TSignalNonStandardTypeName, signalName: string): boolean {
        const index = this._subscribedSignals.findIndex(s => s.signalType === signalType && s.signalName === signalName);
        if (index === -1) {
            return false; // Not subscribed
        }

        const subRecord = this._subscribedSignals[index];
        window.CrComLib.unsubscribeState(subRecord.signalType, subRecord.signalName, subRecord.subscriptionId);
        this._subscribedSignals.splice(index, 1);

        return true;
    }

    private _prepopulateSignals(): void {
        const subscriptions = window.CrComLib.getSubscriptionsCount();
        Object.values(subscriptions).forEach(bag => {
            Object.values(bag).forEach(signal => {
                let subResult = this._subscribeSignalInner(signal.type, signal.name);
                if (!subResult) {
                    console.warn(`[JoinProxyService] Signal ${signal.type}/${signal.name} already subscribed!`);
                }
            });
        });
    }
}