# 📖 Complete Installation Guide - CH5 HA Bridge

This guide will walk you through every step of installing the CH5 HA Bridge on your Crestron tablets and integrating with Home Assistant.

## 📋 Table of Contents

1. [Before You Begin](#before-you-begin)
2. [Part 1: Computer Setup](#part-1-computer-setup)
3. [Part 2: Home Assistant Setup](#part-2-home-assistant-setup)
4. [Part 3: Tablet Configuration](#part-3-tablet-configuration)
5. [Part 4: Deployment](#part-4-deployment)
6. [Part 5: Testing & Verification](#part-5-testing--verification)
7. [Part 6: Creating Automations](#part-6-creating-automations)
8. [Common Issues & Solutions](#common-issues--solutions)

---

## Before You Begin

### ✅ Checklist

- [ ] Computer with Node.js 18+ installed ([Download Node.js](https://nodejs.org/))
- [ ] Home Assistant running with MQTT broker
- [ ] Crestron TSW tablet(s) on the same network
- [ ] Tablet IP addresses noted down
- [ ] About 30 minutes for setup

### 🔍 Find Your Tablet Information

1. **Find tablet IP address:**
   - On tablet: Settings → About → Network → IP Address
   - Or check your router's DHCP client list

2. **Identify tablet model:**
   - Look at the back of the tablet
   - TSW-560 (5"), TSW-760 (7"), or TSW-1060 (10.1")

3. **Test network connectivity:**
   - Open browser on your computer
   - Navigate to `http://<tablet-ip>`
   - You should see the Crestron web interface

---

## Part 1: Computer Setup

### Step 1.1: Download the Project

#### Option A: Using Git
```bash
git clone https://github.com/jrtownse/ch5-ha-bridge.git
cd ch5-ha-bridge
```

#### Option B: Download ZIP
1. Go to https://github.com/jrtownse/ch5-ha-bridge
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file
4. Open terminal/command prompt in the extracted folder

### Step 1.2: Install Dependencies

```bash
# If you have yarn
yarn install

# OR if you have npm
npm install
```

### Step 1.3: Run Initial Setup

**Mac/Linux:**
```bash
chmod +x quickstart.sh
./quickstart.sh
```

**Windows:**
```bash
# Run each command separately
npm install
copy .env.template .env
npm run build:polyfill
node scripts/ha-setup.js
```

### Step 1.4: Configure Environment

Edit the `.env` file with a text editor:

```env
# MQTT Settings - Get these from Home Assistant
VITE_MQTT_URL="ws://192.168.1.50:1884/mqtt"  # Change IP to your HA IP
VITE_MQTT_USERNAME="mqtt_user"                # Your MQTT username
VITE_MQTT_PASSWORD="mqtt_password"            # Your MQTT password

# Home Assistant URL
VITE_HA_DASHBOARD_URL="http://192.168.1.50:8123/local/crestron/coldboot.html?redirect_to=/lovelace/0"
# Change 192.168.1.50 to your Home Assistant IP
# Change /lovelace/0 to your desired dashboard
```

### Step 1.5: Configure Your Tablets

Edit `config/deployment-config.json`:

```json
{
  "deployments": {
    "tablet1": {
      "enabled": true,
      "profile": "TSW-1060",           // Your tablet model
      "hostname": "192.168.1.100",     // Your tablet's IP
      "serial": "TABLET01",            // Any unique name
      "location": "Living Room",       // Friendly name
      "ha_dashboard": "/lovelace/0"    // Dashboard to show
    }
  },
  "global": {
    "home_assistant": {
      "url": "http://192.168.1.50:8123"  // Your HA URL
    },
    "mqtt": {
      "broker": "ws://192.168.1.50:1884/mqtt",  // Your MQTT WebSocket URL
      "username": "mqtt_user",                   // Your MQTT username
      "password": "mqtt_password"                // Your MQTT password
    }
  }
}
```

---

## Part 2: Home Assistant Setup

### Step 2.1: Install MQTT Broker (if not installed)

1. **Open Home Assistant**
2. **Go to:** Settings → Add-ons → Add-on Store
3. **Search for:** Mosquitto broker
4. **Click:** Install
5. **After installation:**
   - Click "Start"
   - Enable "Start on boot"
   - Enable "Watchdog"

### Step 2.2: Configure MQTT User

1. **Go to:** Settings → People → Users
2. **Click:** Add User
3. **Create user:**
   - Username: `mqtt_user`
   - Password: `your_secure_password`
   - Can only log in from local network: ✓

### Step 2.3: Create Crestron Directory

#### Using File Editor Add-on:
1. **Install File Editor:** Settings → Add-ons → File editor
2. **Open File Editor**
3. **Click folder icon** → Create folder
4. **Path:** `/config/www/crestron`

#### Using SSH:
```bash
ssh root@homeassistant.local
mkdir -p /config/www/crestron
```

### Step 2.4: Copy Files to Home Assistant

**From your computer, copy these files:**

```bash
# From the project directory
cd homeassistant

# Copy files (adjust IP as needed)
scp polyfill_localstorage.js root@192.168.1.50:/config/www/crestron/
scp coldboot.html root@192.168.1.50:/config/www/crestron/
scp *.yaml root@192.168.1.50:/config/
```

**Or manually copy:**
1. `homeassistant/polyfill_localstorage.js` → `/config/www/crestron/`
2. `homeassistant/coldboot.html` → `/config/www/crestron/`

### Step 2.5: Update Home Assistant Configuration

Edit `/config/configuration.yaml`:

```yaml
# Add these lines
frontend:
  extra_module_url:
    - /local/crestron/polyfill_localstorage.js

http:
  use_x_frame_options: false

# Note: MQTT discovery is enabled by default in Home Assistant 2022.6+
# No additional MQTT configuration needed in YAML
```

### Step 2.6: Check Configuration & Restart

1. **Go to:** Developer Tools → YAML → Check Configuration
2. **If valid:** Click "Restart" → "Restart Home Assistant"
3. **Wait** 2-3 minutes for HA to restart

---

## Part 3: Tablet Configuration

### Step 3.1: Access Tablet Web Interface

1. **Open browser:** `http://<tablet-ip>`
2. **Login:** Usually `admin` with no password

### Step 3.2: Set Static IP (Recommended)

1. **Navigate to:** Device Settings → Network
2. **Configure:**
   - DHCP: Disabled
   - IP Address: (keep current or set new)
   - Subnet Mask: 255.255.255.0 (usually)
   - Gateway: Your router IP
   - DNS: Your router IP or 8.8.8.8
3. **Click:** Apply

### Step 3.3: Disable Auto-Updates

1. **Navigate to:** Device Settings → Firmware
2. **Set:** Auto Update: Disabled
3. **Click:** Apply

> ⚠️ **Important:** This prevents Crestron from overwriting your custom app

### Step 3.4: Note Current Settings

Write down:
- Tablet IP: _______________
- Model: _________________
- Serial/Name: ____________

---

## Part 4: Deployment

### Step 4.1: Build for Your Tablets

```bash
# Go back to project directory
cd ~/ch5-ha-bridge  # Or wherever you extracted it

# List your configured tablets
npm run deploy:list
```

You should see your configured tablets listed.

### Step 4.2: Deploy to Tablets

#### Deploy to All Tablets:
```bash
npm run deploy:all
```

#### Deploy to Specific Tablet:
```bash
npm run deploy:single tablet1
```

### Step 4.3: What to Expect

The deployment will:
1. **Build** custom app for each tablet (~30 seconds)
2. **Create** CH5Z archive file
3. **Upload** to tablet over network (~1-2 minutes)
4. **Restart** tablet automatically

**Success looks like:**
```
📱 Deploying to tablet1 (Living Room)
   Profile: TSW-1060
   Host: 192.168.1.100
   Building application...
   Creating CH5Z archive...
   Deploying to tablet...
   ✅ Successfully deployed to tablet1
```

### Step 4.4: Tablet Will Restart

After deployment:
1. Tablet screen goes black
2. Shows Crestron logo
3. Loads Home Assistant dashboard (~10-30 seconds)

---

## Part 5: Testing & Verification

### Step 5.1: Check Tablet Display

The tablet should show:
- Your Home Assistant dashboard
- No browser navigation bars
- Full screen display

### Step 5.2: Test Hardware Buttons

Press each button and verify in Home Assistant:

1. **Open HA:** Developer Tools → Events
2. **Listen to:** `*`
3. **Press buttons** on tablet
4. **Look for** MQTT events

### Step 5.3: Check MQTT Connection

```bash
# On your computer
mosquitto_sub -h 192.168.1.50 -u mqtt_user -P mqtt_password -t "crestron/tablets/#" -v
```

You should see messages when pressing buttons.

### Step 5.4: Verify Auto-Discovery

1. **Go to:** Settings → Devices & Services
2. **Look for:** MQTT
3. **Click:** MQTT → Devices
4. **Find:** Your tablet device

You should see entities for:
- Button sensors
- Display switch
- LED controls

### Step 5.5: Access Configuration Panel

On the tablet:
1. **Tap 5 times** in top-right corner
2. **Enter PIN:** 1234
3. **Verify** settings are correct
4. **Test** MQTT connection

---

## Part 6: Creating Automations

### Example 1: Light Control with Hardware Button

**Via UI:**
1. Settings → Automations → Create Automation
2. **Trigger:** MQTT
   - Topic: `crestron/tablets/tablet1/hardButton/BUTTON_LIGHTBULB/press`
   - Payload: `true`
3. **Action:** Call Service
   - Service: `light.toggle`
   - Entity: `light.living_room`

**Via YAML:**
```yaml
automation:
  - alias: "Tablet Light Button"
    trigger:
      - platform: mqtt
        topic: "crestron/tablets/tablet1/hardButton/BUTTON_LIGHTBULB/press"
        payload: "true"
    action:
      - service: light.toggle
        entity_id: light.living_room
```

### Example 2: Sync Button LED with Light

```yaml
automation:
  - alias: "Sync Tablet LED with Light"
    trigger:
      - platform: state
        entity_id: light.living_room
    action:
      - service: mqtt.publish
        data:
          topic: "crestron/tablets/tablet1/hardButton/BUTTON_LIGHTBULB/active"
          payload: "{{ 'true' if is_state('light.living_room', 'on') else 'false' }}"
```

### Example 3: Screensaver at Night

```yaml
automation:
  - alias: "Tablet Screensaver Night"
    trigger:
      - platform: time
        at: "22:00:00"
    action:
      - service: mqtt.publish
        data:
          topic: "crestron/tablets/tablet1/screensaver/config"
          payload: '{"enabled": true, "timeout": 60, "mode": "clock"}'
```

---

## Common Issues & Solutions

### Issue: Tablet Shows "Page Cannot Be Displayed"

**Solutions:**
1. Check Home Assistant is accessible from tablet
2. Verify coldboot.html is in `/config/www/crestron/`
3. Check URL in .env file
4. Restart Home Assistant

### Issue: MQTT Not Connecting

**Solutions:**
1. Check MQTT broker is running
2. Verify username/password
3. Check WebSocket port (usually 1884 or 9001)
4. Try IP address instead of hostname

### Issue: Buttons Not Working

**Solutions:**
1. Check MQTT connection in config panel
2. Verify topic structure in automations
3. Monitor MQTT with mosquitto_sub
4. Restart tablet

### Issue: Deployment Fails

**Solutions:**
1. Check tablet IP is correct
2. Verify tablet is on same network
3. Try manual deployment
4. Check Node.js version (must be 18+)

### Issue: Configuration Panel Won't Open

**Solutions:**
1. Ensure tapping in exact corner (top-right)
2. Try 5 quick taps
3. Check browser console for errors
4. Restart application

---

## 🎉 Success Checklist

- [ ] Tablets showing Home Assistant dashboard
- [ ] Hardware buttons triggering MQTT events
- [ ] Entities appearing in Home Assistant
- [ ] Configuration panel accessible
- [ ] At least one automation working

---

## Need Help?

- **Discord:** https://discord.gg/Dw8wJV5Bva
- **GitHub Issues:** https://github.com/jrtownse/ch5-ha-bridge/issues
- **Original Project:** https://github.com/KazWolfe/ch5-ha-bridge
- **Home Assistant Community:** https://community.home-assistant.io

---

## Next Steps

1. **Create automations** for your specific use cases
2. **Configure screensaver** for each tablet
3. **Set up dashboard** optimized for tablet display
4. **Customize** button behaviors
5. **Enable auto-updates** if desired

Congratulations! Your Crestron tablets are now powerful Home Assistant controllers! 🎊