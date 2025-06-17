const CSIG_DEVICE_HOSTNAME  = "Csig.fb18231";
const CSIG_SERIAL_NUMBER    = "Csig.fb32787";
const CSIG_TSID             = "Csig.fb32986";
const CSIG_FIRMWARE_VERSION = "Csig.fb32769";
const CSIG_FIRMWARE_BUILD   = "Csig.fb32987";

const CSIG_SUBNET_MASK   = "Csig.fb17301";
const CSIG_GATEWAY_IP    = "Csig.fb17302";
const CSIG_PRIMARY_DNS   = "Csig.fb17316";
const CSIG_SECONDARY_DNS = "Csig.fb17317";

export class DeviceInfo {
    public static getDeviceInfo() {
        return {
            deviceName: window.CrComLib.getStringSignalValue(CSIG_DEVICE_HOSTNAME),
            serialNumber: this.getSerialNumber(),
            tsid: this.getTSID(),
            modelNumber: this.getModelNumber(),
            firmware: {
                version: window.CrComLib.getStringSignalValue(CSIG_FIRMWARE_VERSION),
                buildDate: window.CrComLib.getStringSignalValue(CSIG_FIRMWARE_BUILD),
            }
        }
    }

    public static getNetworkInfo() {
        return {
            ipAddress: window.CrComLib.getStringSignalValue("Csig.Ip_Address_fb"),
            macAddress: window.CrComLib.getStringSignalValue("Csig.MAC_Address_fb"),
            subnetMask: window.CrComLib.getStringSignalValue(CSIG_SUBNET_MASK),
            gatewayIp: window.CrComLib.getStringSignalValue(CSIG_GATEWAY_IP),
            dnsServers: [
                window.CrComLib.getStringSignalValue(CSIG_PRIMARY_DNS),
                window.CrComLib.getStringSignalValue(CSIG_SECONDARY_DNS),
            ]
        }
    }

    public static getTSID() {
        let tsid = window.CrComLib.getStringSignalValue(CSIG_TSID, "DEADBEEF");
        console.log(`[DeviceInfo] Got TSID: ${tsid}`);

        return tsid;
    }

    public static getModelNumber() {
        return window.CrComLib.getStringSignalValue("Csig.Product_Name_Text_Join_fb", "UnidentifiedModel");
    }

    public static getSerialNumber() {
        return window.CrComLib.getStringSignalValue(CSIG_SERIAL_NUMBER, "1234567890");
    }
}

window.CH5DeviceInfo = DeviceInfo;