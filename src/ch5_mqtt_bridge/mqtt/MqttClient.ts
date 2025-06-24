import mqtt from "mqtt";
import {IClientSubscribeOptions, MqttClient} from "mqtt/mqtt";
import {DeviceInfo} from "../interop/DeviceInfo.ts";
import {injectable} from "inversify";
import {RouteCallback} from "./router/RouteTypes.ts";
import {MqttRouter} from "./MqttRouter.ts";
import {IClientPublishOptions} from "mqtt/lib/client";


@injectable("Singleton")
export default class Ch5MqttConnector {
    private _mqttClient: MqttClient;
    private _baseTopic: string | undefined;

    private _router: MqttRouter;

    private constructor() {
        this._router = new MqttRouter();

        this._mqttClient = mqtt.connect(import.meta.env.VITE_MQTT_URL, {
            username: import.meta.env.VITE_MQTT_USERNAME,
            password: import.meta.env.VITE_MQTT_PASSWORD,
            protocolVersion: 5,
        });

        this._mqttClient.on("connect", this._onConnect.bind(this))
        this._mqttClient.on("message", this._onMessage.bind(this));
    }

    private _onConnect() {
        this._baseTopic = `crestron/ch5_mqtt/${DeviceInfo.getModelNumber()}_${DeviceInfo.getTSID()}`;
        console.log(`[MqttConnector] Connected to MQTT broker. Base topic: ${this._baseTopic}`);
        this._mqttClient.subscribe(`${this._baseTopic}/#`, { nl: true } as IClientSubscribeOptions);
    }

    private _onMessage(topic: string, message: any) {
        try {
            const messageObject = JSON.parse(message.toString());
            console.log(`[MqttConnector] Received message on topic ${topic}:`, messageObject);

            if (!topic.startsWith(`${this._baseTopic!}/`)) {
                return;
            }

            let cleanedTopic = topic.slice(this._baseTopic!.length + 1);
            this._router.handleMessage(cleanedTopic, messageObject);
        } catch (error) {
            console.error(`[MqttConnector] Error processing message on topic ${topic}!`, error, message.toString());
        }
    }

    public sendMessage(topic: string, message: any, args?: IClientPublishOptions) {
        if (this._baseTopic === undefined) {
            console.error("[MqttConnector] Base topic is not set. Was a connection established?");
            return;
        }

        const fullTopic = `${this._baseTopic}/${topic}`
        this._mqttClient.publish(fullTopic, JSON.stringify(message), args);
        console.log(`[MqttConnector] Sent message on topic ${topic}:`, message);
    }

    public registerRoute(topicSpec: string, handler: RouteCallback) {
        this._router.registerRoute(topicSpec, handler);
    }

    public connectCallback(callback: () => void) {
        this._mqttClient.on("connect", callback);
    }
}