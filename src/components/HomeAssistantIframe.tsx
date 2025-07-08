import {useState} from "react";

export default function HomeAssistantIframe() {
    const [frameUrl, setFrameUrl] = useState<string>(import.meta.env.VITE_HA_DASHBOARD_URL);
    const [frameScale, setFrameScale] = useState<number>(1 / window.devicePixelRatio);

    return <>
        <iframe src={ frameUrl } className={ "hass-iframe" } style={{
            width: `${100 / frameScale}vw`,
            height: `${100 / frameScale}vh`,
            transform: `scale(${frameScale})`,
            transformOrigin: `0 0`,
        }}></iframe>
    </>
}