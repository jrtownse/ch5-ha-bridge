import {Ch5Signal} from "@crestron/ch5-crcomlib";
import {TSignalNonStandardTypeName} from "@crestron/ch5-crcomlib/build_bundles/umd/@types/ch5-core/types/core";

export type CrestronSignalBag = {
    "boolean": {
        [key: string]: Ch5Signal<boolean> | null;
    };
    "number": {
        [key: string]: Ch5Signal<number> | null;
    };
    "object": {
        [key: string]: Ch5Signal<object> | null;
    };
    "string": {
        [key: string]: Ch5Signal<string> | null;
    };
}

export type SignalRegistrationRecord = { signalType: TSignalNonStandardTypeName, signalName: string, subscriptionId: string }
