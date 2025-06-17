import {injectable} from "inversify";

import {ColorTuple, ColorUtil} from "../../util/ColorUtil.ts";
import {MathUtil} from "../../util/MathUtil.ts";
import {InputUtil} from "../../util/InputUtil.ts";

export type LedStateChangeCallback = (color: ColorTuple) => void;

@injectable("Singleton")
export class LedAccessoryController {
    constructor() {
        window.CrComLib.subscribeState("boolean", "Csig.LedAccessoryConnected_fb", (s: boolean) => {
            // this._hasAccessory = s;
        });

        const f_debounceNotify = InputUtil.debounce(() => {
            this._notifyLedStateChange();
        });

        // note: these will immediately trigger the callback.
        window.CrComLib.subscribeState("boolean", "Csig.RedLedControl_fb", (s: boolean) => {
            this._cachedChannelPower[0] = s;
            f_debounceNotify();
        });

        window.CrComLib.subscribeState("boolean", "Csig.GreenLedControl_fb", (s: boolean) => {
            this._cachedChannelPower[1] = s;
            f_debounceNotify();
        });

        window.CrComLib.subscribeState("boolean", "Csig.BlueLedControl_fb", (s: boolean) => {
            this._cachedChannelPower[2] = s;
            f_debounceNotify();
        })

        window.CrComLib.subscribeState("number", "Csig.RedLedBrightness_fb", (s: number) => {
            this._cachedLedChannels[0] = s;
            f_debounceNotify();
        });

        window.CrComLib.subscribeState("number", "Csig.GreenLedBrightness_fb", (s: number) => {
            this._cachedLedChannels[1] = s;
            f_debounceNotify();
        });

        window.CrComLib.subscribeState("number", "Csig.BlueLedBrightness_fb", (s: number) => {
            this._cachedLedChannels[2] = s;
            f_debounceNotify();
        });
    }

    public static MAX_LED_BRIGHTNESS = 100;

    /* Crestron cached state tracking */

    private _hasAccessory: boolean = true;
    private _cachedLedChannels: ColorTuple = [0, 0, 0];
    private _cachedChannelPower: [red: boolean, green: boolean, blue: boolean] = [false, false, false];

    /* Internal state tracking */

    private _ledStateChangeCallbacks: LedStateChangeCallback[] = [];

    /* Getters/setters */

    public get hasAccessory(): boolean { return this._hasAccessory; }

    public get power(): boolean {
        if (!this._hasAccessory) {
            return false;
        }

        return this._cachedChannelPower[0] || this._cachedChannelPower[1] || this._cachedChannelPower[2];
    }

    public set power(value: boolean): void {
        if (!this._hasAccessory) {
            return;
        }

        window.CrComLib.publishEvent("boolean", "Csig.RedLedControl", value);
        window.CrComLib.publishEvent("boolean", "Csig.GreenLedControl", value);
        window.CrComLib.publishEvent("boolean", "Csig.BlueLedControl", value);
    }

    /**
     * Gets the current LED brightness as a value between 0 and 100.
     */
    public get brightness(): number {
        if (!this._hasAccessory) {
            return 0;
        }

        return Math.max(...this._cachedLedChannels);
    }

    public set brightness(value: number) {
        if (!this._hasAccessory) {
            return;
        }

        let scaleFactor = MathUtil.clamp(value, 0, LedAccessoryController.MAX_LED_BRIGHTNESS) / currentBrightness;

        this.color = [
            Math.min(Math.round(this._cachedLedChannels[0] * scaleFactor), LedAccessoryController.MAX_LED_BRIGHTNESS),
            Math.min(Math.round(this._cachedLedChannels[1] * scaleFactor), LedAccessoryController.MAX_LED_BRIGHTNESS),
            Math.min(Math.round(this._cachedLedChannels[2] * scaleFactor), LedAccessoryController.MAX_LED_BRIGHTNESS)
        ];
    }

    /**
     * Gets the true color of the LED, including any scaling for brightness settings.
     */
    public get color(): ColorTuple | null {
        if (!this._hasAccessory) {
            return null;
        }

        return [
            this._cachedLedChannels[0],
            this._cachedLedChannels[1],
            this._cachedLedChannels[2]
        ];
    }

    public set color(value: ColorTuple) {
        if (!this._hasAccessory) {
            return;
        }

        window.CrComLib.publishEvent("number", "Csig.RedLedBrightness", value[0]);
        window.CrComLib.publishEvent("number", "Csig.GreenLedBrightness", value[1]);
        window.CrComLib.publishEvent("number", "Csig.BlueLedBrightness", value[2]);
    }

    /**
     * Friendly method to apply a color to the LED. Allows hex codes and named colors known to the browser.
     * @param color A color hex or name to apply to the LED accessory.
     */
    public setColor(color: string): void {
        let tuple: string;
        if (color.startsWith("#")) {
            tuple = ColorUtil.colorTupleToHex(color);
        } else {
            tuple = ColorUtil.namedToTuple(color);
        }

        this.color = ColorUtil.scaleColorTuple(tuple, 255, LedAccessoryController.MAX_LED_BRIGHTNESS);
    }

    public addLedStateChangeCallback(callback: LedStateChangeCallback): void {
        this._ledStateChangeCallbacks.push(callback);
    }

    /**
     * Check if the LED accessory has a consistent power state across all channels.
     */
    private _isPowerStateConsistent(): boolean {
        return (this._cachedChannelPower[0] === this._cachedLedChannels[1] === this._cachedChannelPower[2]);
    }

    private _notifyLedStateChange(): void {
        this._ledStateChangeCallbacks.forEach(callback => callback());
    }
}