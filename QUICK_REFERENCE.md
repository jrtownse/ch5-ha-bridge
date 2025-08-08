# 🚀 CH5 HA Bridge - Quick Reference Card

## Essential Commands

| Command | Description |
|---------|-------------|
| `./quickstart.sh` | Initial setup wizard |
| `npm run deploy:list` | List configured tablets |
| `npm run deploy:all` | Deploy to all tablets |
| `npm run deploy:single <name>` | Deploy to specific tablet |
| `npm run ha:setup` | Generate HA configs |
| `npm run build:polyfill` | Build localStorage polyfill |

## File Locations

### On Your Computer
```
ch5-ha-bridge/
├── .env                          # Your environment settings
├── config/deployment-config.json # Tablet configurations
└── homeassistant/*.js/*.html     # Files to copy to HA
```

### On Home Assistant
```
/config/
├── configuration.yaml            # Main HA config
└── www/crestron/                # Crestron files go here
    ├── polyfill_localstorage.js
    └── coldboot.html
```

## MQTT Topics Reference

### Button Events
```
crestron/tablets/<tablet_name>/hardButton/<BUTTON>/press
```
Where `<BUTTON>` is:
- `BUTTON_POWER`
- `BUTTON_HOME`
- `BUTTON_LIGHTBULB`
- `BUTTON_UP`
- `BUTTON_DOWN`

### LED Control
```
# Individual button LED
crestron/tablets/<tablet_name>/hardButton/<BUTTON>/active

# Global brightness (0-65535)
crestron/tablets/<tablet_name>/hardButton/brightness
```

### Display Control
```
# Power on/off
crestron/tablets/<tablet_name>/display/power/set
```

### Screensaver
```
# Configure
crestron/tablets/<tablet_name>/screensaver/config

# Activate/deactivate
crestron/tablets/<tablet_name>/screensaver/activate
crestron/tablets/<tablet_name>/screensaver/deactivate
```

### Updates
```
# Check for updates
crestron/tablets/<tablet_name>/update/check

# Apply update
crestron/tablets/<tablet_name>/update/apply
```

## Configuration Panel

**Access:** Tap 5 times in top-right corner (100x100px area)
**Default PIN:** 1234

### Available Settings
- MQTT connection
- Home Assistant URL
- Dashboard selection
- Screensaver mode
- Update preferences

## Home Assistant Configuration

### Required in configuration.yaml
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

## Sample Automation

### Basic Button → Light
```yaml
automation:
  - alias: "Tablet Light Control"
    trigger:
      - platform: mqtt
        topic: "crestron/tablets/livingroom/hardButton/BUTTON_LIGHTBULB/press"
        payload: "true"
    action:
      - service: light.toggle
        entity_id: light.living_room
```

### LED Sync with Light
```yaml
automation:
  - alias: "Sync LED with Light"
    trigger:
      - platform: state
        entity_id: light.living_room
    action:
      - service: mqtt.publish
        data:
          topic: "crestron/tablets/livingroom/hardButton/BUTTON_LIGHTBULB/active"
          payload: "{{ 'true' if is_state('light.living_room', 'on') else 'false' }}"
```

## Tablet Profiles

| Model | Resolution | Features |
|-------|------------|----------|
| TSW-560 | 800×480 | 5" screen, 5 buttons |
| TSW-760 | 1024×600 | 7" screen, 5 buttons, LED strip |
| TSW-1060 | 1280×800 | 10.1" screen, 5 buttons, LED strip |
| *-NC variants | Same | No camera/microphone |

## Network Requirements

- **Tablet & HA:** Same network/VLAN
- **Ports:**
  - HTTP: 8123 (Home Assistant)
  - MQTT: 1883 (standard), 1884/9001 (WebSocket)
- **Protocols:** HTTP, WebSocket, MQTT

## Troubleshooting Checklist

### Tablet Not Loading
- [ ] Can ping tablet IP?
- [ ] Can access tablet web interface?
- [ ] Home Assistant accessible from tablet network?
- [ ] coldboot.html in /config/www/crestron/?
- [ ] .env file configured correctly?

### MQTT Issues
- [ ] MQTT broker running?
- [ ] Correct username/password?
- [ ] WebSocket port correct?
- [ ] Can connect with MQTT Explorer?

### Button Issues
- [ ] MQTT events visible in mosquitto_sub?
- [ ] Topic structure correct in automation?
- [ ] Button LED responding to commands?

## Monitor MQTT Traffic

```bash
# All tablet traffic
mosquitto_sub -h <HA_IP> -u <user> -P <pass> -t "crestron/tablets/#" -v

# Specific tablet
mosquitto_sub -h <HA_IP> -u <user> -P <pass> -t "crestron/tablets/livingroom/#" -v

# Just buttons
mosquitto_sub -h <HA_IP> -u <user> -P <pass> -t "crestron/tablets/+/hardButton/#" -v
```

## Test MQTT Publishing

```bash
# Test button LED
mosquitto_pub -h <HA_IP> -u <user> -P <pass> \
  -t "crestron/tablets/livingroom/hardButton/BUTTON_POWER/active" \
  -m "true"

# Test display power
mosquitto_pub -h <HA_IP> -u <user> -P <pass> \
  -t "crestron/tablets/livingroom/display/power/set" \
  -m "false"
```

## Environment Variables

```env
# Required
VITE_MQTT_URL="ws://192.168.1.50:1884/mqtt"
VITE_MQTT_USERNAME="mqtt_user"
VITE_MQTT_PASSWORD="mqtt_password"
VITE_HA_DASHBOARD_URL="http://192.168.1.50:8123/local/crestron/coldboot.html?redirect_to=/lovelace/0"

# Optional
VITE_TABLET_PROFILE="TSW-1060"
VITE_TABLET_SERIAL="TABLET01"
VITE_TABLET_LOCATION="Living Room"
VITE_AUTO_UPDATE="false"
VITE_UPDATE_CHECK_INTERVAL="3600"
```

## Deploy Configuration Structure

```json
{
  "deployments": {
    "<name>": {
      "enabled": true,
      "profile": "TSW-1060",
      "hostname": "192.168.1.100",
      "serial": "UNIQUE_ID",
      "location": "Room Name",
      "ha_dashboard": "/lovelace/0"
    }
  }
}
```

## Useful Home Assistant Services

```yaml
# Reload automations without restart
service: automation.reload

# Test MQTT connection
service: mqtt.publish
data:
  topic: "test/topic"
  payload: "test"

# Force device discovery
service: mqtt.dump_discovery
```

## Emergency Recovery

### Reset Tablet
1. Access web interface: `http://<tablet_ip>`
2. System → Restart
3. Redeploy application

### Clear Everything
```bash
# On tablet web interface
1. Applications → Delete All
2. System → Restart

# Redeploy
npm run deploy:single <tablet_name>
```

### Factory Reset (Last Resort)
1. Hold setup button while powering on
2. Follow on-screen instructions
3. Reconfigure network
4. Redeploy application

---

**Support:** [Discord](https://discord.gg/Dw8wJV5Bva) | [GitHub](https://github.com/KazWolfe/ch5-ha-bridge)