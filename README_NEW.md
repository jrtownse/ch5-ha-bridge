# 🏠 Crestron CH5 Home Assistant Bridge

Transform your Crestron TSW-xx60/xx70 touch panels into powerful Home Assistant controllers without any Crestron programming or control processor!

[![Discord](https://img.shields.io/discord/1391887962102566962?logo=discord&logoColor=white&label=discord&color=%235865F2)](https://discord.gg/Dw8wJV5Bva)
[![Version](https://img.shields.io/badge/version-4.0.0-blue)](https://github.com/KazWolfe/ch5-ha-bridge)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ Features

### 🎯 Core Functionality
- **No Control Processor Required** - Runs entirely on the tablet
- **No Root Access Needed** - Uses standard CH5 deployment
- **MQTT Integration** - Full bidirectional communication with Home Assistant
- **Hardware Button Support** - All 5 physical buttons exposed to HA
- **LED Control** - Control button LEDs and brightness
- **Display Management** - Power on/off, brightness control

### 🚀 New Advanced Features
- **Auto-Discovery** - Tablets automatically appear in Home Assistant
- **Multi-Tablet Deployment** - Deploy to entire fleet with one command
- **OTA Updates** - Remote updates via MQTT
- **Screensaver Mode** - Customizable screensaver with clock, weather, or HA dashboard
- **On-Panel Configuration** - PIN-protected settings directly on tablet
- **Device Profiles** - Pre-configured for TSW-560/760/1060 models

### 📱 Supported Tablets
- TSW-560 / TSW-560-NC (5" display)
- TSW-760 / TSW-760-NC (7" display)
- TSW-1060 / TSW-1060-NC (10.1" display)
- TSW-x70 series (with limitations)

> **Note:** NC models lack camera and microphone but are otherwise fully supported.

## 📋 Prerequisites

### Required
- **Node.js 18+** and npm/yarn
- **Home Assistant** with MQTT broker (Mosquitto add-on recommended)
- **Crestron TSW tablet(s)** with network access
- **Static IP addresses** for tablets (recommended)

### Optional but Recommended
- **File editor** add-on for Home Assistant
- **MQTT Explorer** for debugging
- **SSH access** to Home Assistant

## 🚀 Quick Start Guide

### Step 1: Initial Setup

```bash
# Clone the repository
git clone https://github.com/KazWolfe/ch5-ha-bridge.git
cd ch5-ha-bridge

# Run the quick start script
chmod +x quickstart.sh
./quickstart.sh
```

This will:
- Install dependencies
- Create default configuration files
- Build the localStorage polyfill
- Generate Home Assistant configurations

### Step 2: Configure Your Environment

Edit the `.env` file with your settings:

```env
# MQTT Configuration
VITE_MQTT_URL="ws://homeassistant.local:8083/mqtt"
VITE_MQTT_USERNAME="mqtt_user"
VITE_MQTT_PASSWORD="mqtt_password"

# Home Assistant URL
VITE_HA_DASHBOARD_URL="http://homeassistant.local:8123/local/crestron/coldboot.html?redirect_to=/lovelace/0"
```

### Step 3: Configure Your Tablets

Edit `config/deployment-config.json`:

```json
{
  "deployments": {
    "livingroom": {
      "enabled": true,
      "profile": "TSW-1060",          // Your tablet model
      "hostname": "192.168.1.100",     // Tablet IP address
      "serial": "LIVINGROOM01",        // Unique identifier
      "location": "Living Room",       // Friendly name
      "ha_dashboard": "/lovelace-livingroom/0",  // HA dashboard path
      "mqtt": {
        "topic_prefix": "livingroom_tablet"
      }
    },
    "kitchen": {
      "enabled": true,
      "profile": "TSW-760",
      "hostname": "192.168.1.101",
      "serial": "KITCHEN01",
      "location": "Kitchen",
      "ha_dashboard": "/lovelace-kitchen/0",
      "mqtt": {
        "topic_prefix": "kitchen_tablet"
      }
    }
  },
  "global": {
    "home_assistant": {
      "url": "http://homeassistant.local:8123",
      "coldboot_path": "/local/crestron/coldboot.html"
    },
    "mqtt": {
      "broker": "ws://homeassistant.local:8083/mqtt",
      "username": "mqtt_user",
      "password": "mqtt_password"
    }
  }
}
```

## 🏠 Home Assistant Setup

### Step 1: Prepare Files

```bash
# Build the polyfill and generate HA configs
npm run ha:setup
```

### Step 2: Copy Files to Home Assistant

#### Method A: Using SSH/SCP
```bash
# Copy to Home Assistant
scp -r homeassistant/* root@homeassistant.local:/config/www/crestron/
```

#### Method B: Using File Editor Add-on
1. Open File Editor in Home Assistant
2. Create folder: `/config/www/crestron/`
3. Upload these files:
   - `polyfill_localstorage.js`
   - `coldboot.html`
   - `tablet-manager.yaml`
   - `mqtt-sensors.yaml`
   - `automations-examples.yaml`

### Step 3: Update Home Assistant Configuration

Add to your `configuration.yaml`:

```yaml
# Enable iframe embedding
frontend:
  extra_module_url:
    - /local/crestron/polyfill_localstorage.js

http:
  use_x_frame_options: false

# Enable MQTT with discovery
mqtt:
  discovery: true
  discovery_prefix: homeassistant
```

### Step 4: Restart Home Assistant

```bash
# Via CLI
ha core restart

# Or via UI
Settings → System → Restart → Restart Home Assistant
```

## 📱 Tablet Preparation

### Step 1: Access Tablet Web Interface

1. Open browser: `http://<tablet-ip>`
2. Default login: `admin` (no password)

### Step 2: Configure Network Settings

1. Go to **Device Settings → Network**
2. Set static IP address
3. Configure DNS (must resolve `homeassistant.local`)
4. Apply settings

### Step 3: Disable Auto-Updates

1. Go to **Device Settings → Firmware**
2. Disable automatic updates
3. This prevents Crestron from overwriting the custom app

## 🚀 Deployment

### Deploy to All Tablets

```bash
# List configured tablets
npm run deploy:list

# Deploy to all enabled tablets
npm run deploy:all
```

### Deploy to Specific Tablet

```bash
# Deploy to single tablet
npm run deploy:single livingroom
```

### Manual Deployment (Single Tablet)

```bash
# Build the application
npm run build:prod

# Create CH5Z archive
npm run archive

# Deploy to tablet
ch5-cli deploy -p -H 192.168.1.100 -t touchscreen archive/ch5-ha-bridge.ch5z --slow-mode
```

### What Happens During Deployment

1. Custom `.env` file created for each tablet
2. Application built with tablet-specific configuration
3. CH5Z archive created
4. Archive deployed to tablet via network
5. Tablet automatically restarts with new app

## 🎮 Using Your Tablets

### Hardware Buttons

All 5 hardware buttons are exposed via MQTT:

| Button | MQTT Topic | Function |
|--------|------------|----------|
| Power | `crestron/tablets/<name>/hardButton/BUTTON_POWER/press` | Power/Wake |
| Home | `crestron/tablets/<name>/hardButton/BUTTON_HOME/press` | Navigation |
| Light | `crestron/tablets/<name>/hardButton/BUTTON_LIGHTBULB/press` | Light Control |
| Up | `crestron/tablets/<name>/hardButton/BUTTON_UP/press` | Brightness Up |
| Down | `crestron/tablets/<name>/hardButton/BUTTON_DOWN/press` | Brightness Down |

### Configuration Panel

Access the on-tablet configuration:

1. **Tap 5 times** in the top-right corner (100x100px area)
2. Enter PIN (default: **1234**)
3. Configure:
   - MQTT connection
   - Home Assistant URL
   - Screensaver settings
   - Update preferences

### Screensaver

The screensaver automatically activates after inactivity. Configure via MQTT:

```yaml
# Home Assistant automation example
automation:
  - alias: "Configure Tablet Screensaver"
    trigger:
      - platform: time
        at: "22:00:00"
    action:
      - service: mqtt.publish
        data:
          topic: "crestron/tablets/livingroom_tablet/screensaver/config"
          payload: |
            {
              "enabled": true,
              "timeout": 300,
              "mode": "clock",
              "brightness": 20
            }
```

## 🔧 Home Assistant Automations

### Example: Toggle Lights with Hardware Button

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

### Example: Brightness Control

```yaml
automation:
  - alias: "Brightness Up"
    trigger:
      - platform: mqtt
        topic: "crestron/tablets/+/hardButton/BUTTON_UP/press"
        payload: "true"
    action:
      - service: light.turn_on
        data:
          entity_id: light.living_room
          brightness_step_pct: 10

  - alias: "Brightness Down"
    trigger:
      - platform: mqtt
        topic: "crestron/tablets/+/hardButton/BUTTON_DOWN/press"
        payload: "true"
    action:
      - service: light.turn_on
        data:
          entity_id: light.living_room
          brightness_step_pct: -10
```

### Example: Sync Button LEDs

```yaml
automation:
  - alias: "Sync Light Button LED"
    trigger:
      - platform: state
        entity_id: light.living_room
    action:
      - service: mqtt.publish
        data:
          topic: "crestron/tablets/livingroom_tablet/hardButton/BUTTON_LIGHTBULB/active"
          payload: "{{ 'true' if is_state('light.living_room', 'on') else 'false' }}"
```

## 🔄 Updates

### Manual Update Check

```yaml
# Via MQTT
service: mqtt.publish
data:
  topic: "crestron/tablets/livingroom_tablet/update/check"
  payload: "{}"
```

### Auto-Updates

Enable in configuration panel or via MQTT:

```yaml
service: mqtt.publish
data:
  topic: "crestron/tablets/livingroom_tablet/update/config"
  payload: |
    {
      "autoUpdate": true,
      "checkInterval": 3600
    }
```

## 📊 Auto-Discovery Entities

When a tablet connects, these entities automatically appear in Home Assistant:

### Device Tracker
- `binary_sensor.<tablet>_status` - Online/offline status

### Sensors
- `sensor.<tablet>_ip_address` - Current IP
- `sensor.<tablet>_uptime` - Uptime in seconds
- `sensor.<tablet>_model` - Tablet model
- `sensor.<tablet>_version` - Software version

### Binary Sensors (Buttons)
- `binary_sensor.<tablet>_power_button` - Power button press
- `binary_sensor.<tablet>_home_button` - Home button press
- `binary_sensor.<tablet>_light_button` - Light button press
- `binary_sensor.<tablet>_up_button` - Up button press
- `binary_sensor.<tablet>_down_button` - Down button press

### Switches
- `switch.<tablet>_display` - Display power
- `switch.<tablet>_power_button_led` - Power button LED
- `switch.<tablet>_home_button_led` - Home button LED
- `switch.<tablet>_light_button_led` - Light button LED
- `switch.<tablet>_up_button_led` - Up button LED
- `switch.<tablet>_down_button_led` - Down button LED

### Lights
- `light.<tablet>_button_brightness` - Button LED brightness
- `light.<tablet>_led_strip` - LED accessory (TSW-760/1060 only)

## 🐛 Troubleshooting

### Tablet Won't Load App

1. **Check network connectivity**
   ```bash
   ping <tablet-ip>
   ```

2. **Verify Home Assistant is accessible**
   ```bash
   curl http://homeassistant.local:8123
   ```

3. **Check MQTT connection**
   ```bash
   mosquitto_sub -h homeassistant.local -t "crestron/tablets/#" -v
   ```

### MQTT Not Connecting

1. **Verify MQTT broker is running**
   ```bash
   ha addons info core_mosquitto
   ```

2. **Check credentials in .env file**

3. **Test with MQTT Explorer**

### Buttons Not Working

1. **Monitor MQTT messages**
   ```bash
   mosquitto_sub -h homeassistant.local -t "crestron/tablets/+/hardButton/#" -v
   ```

2. **Check button LED status**
   ```yaml
   service: mqtt.publish
   data:
     topic: "crestron/tablets/<tablet>/hardButton/BUTTON_POWER/active"
     payload: "true"
   ```

### Configuration Panel Not Opening

1. Ensure you're tapping in the correct area (top-right corner)
2. Try both touch and mouse clicks
3. Check browser console for errors (if debug access available)

### Reset Everything

```bash
# On tablet web interface
1. Go to System → Restart
2. Clear browser cache

# Redeploy application
npm run deploy:single <tablet-name>
```

## 📁 Project Structure

```
ch5-ha-bridge/
├── config/
│   ├── deployment-config.json    # Tablet configurations
│   └── tablet-profiles.json      # Device profiles
├── homeassistant/
│   ├── coldboot.html             # Bootstrap loader
│   ├── polyfill_localstorage.ts  # LocalStorage polyfill
│   ├── automations-examples.yaml # Example automations
│   └── tablet-manager.yaml       # HA dashboard config
├── scripts/
│   ├── deploy-manager.js         # Deployment automation
│   └── ha-setup.js              # HA setup generator
├── src/
│   ├── ch5_mqtt_bridge/         # Core bridge code
│   │   ├── services/            # Service layer
│   │   │   ├── AutodiscoveryService.ts
│   │   │   ├── ScreensaverService.ts
│   │   │   └── UpdateService.ts
│   │   ├── interop/             # Hardware controllers
│   │   └── mqtt/                # MQTT client
│   └── components/
│       ├── ConfigPanel.tsx      # Configuration UI
│       └── HomeAssistantFrame.tsx # HA dashboard wrapper
├── .env.template                # Environment template
├── package.json                 # Dependencies
└── quickstart.sh               # Setup script
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## ⚠️ Important Notes

### Security
- Change the default configuration PIN (1234)
- Use strong MQTT passwords
- Consider network segmentation for IoT devices
- Disabling `use_x_frame_options` slightly reduces HA security

### Limitations
- Camera RTSP streaming not available (Crestron restriction)
- No root access to tablets
- Some features require specific tablet models
- Unofficial project using undocumented features

### Warranty
**This project is not affiliated with, endorsed by, or supported by Crestron.** Use at your own risk. This is not a replacement for a properly configured Crestron control system.

## 📚 Resources

- [Discord Community](https://discord.gg/Dw8wJV5Bva)
- [Original Project](https://github.com/KazWolfe/ch5-ha-bridge)
- [Home Assistant MQTT](https://www.home-assistant.io/integrations/mqtt/)
- [Crestron CH5 Documentation](https://sdkcon78221.crestron.com/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- KazWolfe for creating the original CH5 HA Bridge
- The Home Assistant community
- Contributors and testers

---

**Made with ❤️ for the Home Automation community**