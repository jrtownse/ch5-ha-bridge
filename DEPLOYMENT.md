# CH5 HA Bridge - Deployment Guide

This guide covers the complete deployment process for the CH5 Home Assistant Bridge on multiple Crestron tablets.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Tablet Configuration](#tablet-configuration)
4. [Home Assistant Setup](#home-assistant-setup)
5. [Building and Deployment](#building-and-deployment)
6. [Hardware Button Integration](#hardware-button-integration)
7. [Update Management](#update-management)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm/yarn installed
- Home Assistant instance with MQTT broker
- One or more Crestron TSW-x60/x70 tablets
- Network access to tablets (they should have static IPs)
- Basic understanding of MQTT and Home Assistant

## Initial Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ch5-ha-bridge
yarn install
```

### 2. Configure Deployment Settings

Edit `config/deployment-config.json` to match your setup:

```json
{
  "deployments": {
    "livingroom": {
      "enabled": true,
      "profile": "TSW-1060",    // Your tablet model
      "hostname": "192.168.1.100", // Tablet IP address
      "serial": "LIVINGROOM01",    // Unique identifier
      "location": "Living Room",   // Friendly name
      "ha_dashboard": "/lovelace-livingroom/0", // HA dashboard path
      "mqtt": {
        "topic_prefix": "livingroom_tablet" // MQTT topic prefix
      }
    }
  }
}
```

### 3. Configure Tablet Profiles

The `config/tablet-profiles.json` file contains pre-configured profiles for different tablet models:
- TSW-560 (5" display)
- TSW-760 (7" display)
- TSW-1060 (10" display)
- NC variants (no camera/microphone)

## Tablet Configuration

### Network Setup

1. Access tablet web interface: `http://<tablet-ip>`
2. Set static IP address
3. Configure DNS to resolve `homeassistant.local`
4. Disable auto-update (prevents overwriting custom app)

### Security Settings

For HTTPS (if using SSL certificates):
1. Upload CA certificate to tablet
2. Configure in Settings > 802.1x Configuration

## Home Assistant Setup

### 1. Compile Polyfill

```bash
npm run build:polyfill
```

### 2. Run Setup Script

```bash
npm run ha:setup
```

This generates:
- `homeassistant/polyfill_localstorage.js` - LocalStorage polyfill
- `homeassistant/coldboot.html` - Bootstrap loader
- `homeassistant/tablet-manager.yaml` - HA dashboard config
- `homeassistant/mqtt-sensors.yaml` - MQTT sensor definitions

### 3. Copy Files to Home Assistant

Copy files to Home Assistant's `www/crestron` directory:

```bash
# For Home Assistant OS/Supervised
scp homeassistant/*.{js,html} homeassistant.local:/config/www/crestron/

# For Home Assistant Container
docker cp homeassistant/. homeassistant:/config/www/crestron/
```

### 4. Update configuration.yaml

Add to your Home Assistant `configuration.yaml`:

```yaml
frontend:
  extra_module_url:
    - /local/crestron/polyfill_localstorage.js

http:
  use_x_frame_options: false

mqtt:
  discovery: true
  discovery_prefix: homeassistant
```

### 5. Add MQTT Sensors

Include the generated sensors in your configuration:

```yaml
mqtt:
  sensor: !include mqtt-sensors.yaml
```

### 6. Restart Home Assistant

```bash
ha core restart
```

## Building and Deployment

### Deploy to All Tablets

```bash
npm run deploy:all
```

This will:
1. Build the application for each tablet with custom configuration
2. Create CH5Z archive files
3. Deploy to each enabled tablet
4. Show deployment summary

### Deploy to Single Tablet

```bash
npm run deploy:single livingroom
```

### List Configured Tablets

```bash
npm run deploy:list
```

### Manual Deployment

For individual manual deployment:

```bash
# Build
npm run build:prod

# Create archive
npm run archive

# Deploy to specific tablet
ch5-cli deploy -p -H 192.168.1.100 -t touchscreen archive/ch5-ha-bridge.ch5z --slow-mode
```

## Hardware Button Integration

The tablets expose 5 hardware buttons via MQTT:

### Available Buttons
- `BUTTON_POWER` - Power/wake button
- `BUTTON_HOME` - Home navigation
- `BUTTON_LIGHTBULB` - Light control
- `BUTTON_UP` - Up arrow
- `BUTTON_DOWN` - Down arrow

### MQTT Topics

Read button presses:
```
crestron/tablets/<tablet_name>/hardButton/<button>/press
```

Control button LEDs:
```
crestron/tablets/<tablet_name>/hardButton/<button>/active
```

Global LED brightness:
```
crestron/tablets/<tablet_name>/hardButton/brightness
```

### Example Automation

```yaml
automation:
  - alias: "Living Room Light Toggle"
    trigger:
      - platform: mqtt
        topic: "crestron/tablets/livingroom_tablet/hardButton/BUTTON_LIGHTBULB/press"
        payload: "true"
    action:
      - service: light.toggle
        entity_id: light.living_room
```

See `homeassistant/automations-examples.yaml` for more examples.

## Update Management

### Manual Updates

1. Build new version:
```bash
npm run build:prod
```

2. Create update package:
```bash
npm run archive
```

3. Place in Home Assistant update directory:
```bash
scp archive/ch5-ha-bridge.ch5z homeassistant.local:/config/www/crestron/updates/
```

4. Create manifest.json:
```json
{
  "version": "4.1.0",
  "releaseDate": "2024-01-01",
  "releaseNotes": "Bug fixes and improvements",
  "downloadUrl": "http://homeassistant.local:8123/local/crestron/updates/ch5-ha-bridge.ch5z",
  "checksum": "sha256hash",
  "criticalUpdate": false
}
```

### OTA Updates via MQTT

Trigger update check:
```bash
mosquitto_pub -t "crestron/tablets/livingroom_tablet/update/check" -m "{}"
```

Apply available update:
```bash
mosquitto_pub -t "crestron/tablets/livingroom_tablet/update/apply" -m "{}"
```

### Auto-Update Configuration

Set in deployment config or via MQTT:
```bash
mosquitto_pub -t "crestron/tablets/livingroom_tablet/update/config" -m '{"autoUpdate": true}'
```

## Troubleshooting

### Common Issues

#### Tablet Won't Load App
- Check network connectivity
- Verify Home Assistant is accessible from tablet
- Check MQTT broker is running
- Review browser console on tablet (if debug access available)

#### LocalStorage Not Working
- Ensure polyfill is loaded correctly
- Check Home Assistant logs for module loading errors
- Verify coldboot.html redirect URL is correct

#### MQTT Not Connecting
- Check MQTT credentials in .env file
- Verify WebSocket port (usually 8083 or 9001)
- Test with MQTT Explorer or mosquitto_sub

#### Button Presses Not Detected
- Verify MQTT topic structure matches automation
- Check tablet serial/name in deployment config
- Monitor MQTT traffic with: `mosquitto_sub -t "crestron/tablets/#" -v`

### Debug Mode

Enable debug console in development builds:
```bash
npm run build:dev
```

Access Eruda console by tapping 5 times in top-right corner.

### Logs

Monitor Home Assistant logs:
```bash
ha core logs -f
```

Monitor MQTT traffic:
```bash
mosquitto_sub -h homeassistant.local -t "crestron/tablets/#" -v
```

### Reset Tablet

If tablet becomes unresponsive:
1. Power cycle the tablet
2. Clear browser cache (if web UI accessible)
3. Re-deploy application

## Advanced Configuration

### Custom Dashboard per Tablet

Modify `VITE_HA_DASHBOARD_URL` in deployment for each tablet to point to different dashboards.

### Camera Streaming (Experimental)

While direct RTSP access is limited, you can:
1. Use tablet's SIP capabilities for video intercom
2. Display external camera feeds in Home Assistant dashboard
3. Research ONVIF discovery options (tablet cameras support ONVIF)

### Performance Optimization

For older/slower tablets:
- Reduce dashboard complexity
- Limit update check frequency
- Disable auto-brightness if not needed
- Use simplified themes in Home Assistant

## Support

For issues and questions:
- Check existing GitHub issues
- Review Home Assistant community forums
- Join Discord server (link in README)

Remember: This project uses undocumented Crestron features that may change without notice.