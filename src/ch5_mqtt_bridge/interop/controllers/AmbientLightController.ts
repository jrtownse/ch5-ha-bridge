import {injectable} from "inversify";

@injectable("Singleton")
export class DisplayController {
    constructor() {
        window.CrComLib.subscribeState("n", "Csig.Light_Sensor_Value_fb", this._handleAmbientLightChange.bind(this));
    }

    private _ambientLightLevelChangeCallbacks: ((level: number) => void)[] = [];

    public get ambientLightLevel(): number {
        return window.CrComLib.getNumericSignalValue("Csig.Light_Sensor_Value_fb", 0);
    }

    public onAmbientLightLevelChange(callback: (level: number) => void): void {
        this._ambientLightLevelChangeCallbacks.push(callback);
    }

    private _handleAmbientLightChange(value: number): void {
        this._ambientLightLevelChangeCallbacks.forEach(cb => cb(value));
    }
}