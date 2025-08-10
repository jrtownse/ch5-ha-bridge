#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class HomeAssistantSetup {
  constructor() {
    this.deploymentConfig = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(projectRoot, 'config/deployment-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('Deployment configuration not found. Please create config/deployment-config.json');
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  generateInstructions() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Home Assistant Setup Instructions                      ║
╚════════════════════════════════════════════════════════════════╝

This script has prepared the necessary files for Home Assistant integration.

📁 Files Generated:
   • homeassistant/polyfill_localstorage.js
   • homeassistant/coldboot.html

🚀 Setup Steps:

1. Copy files to Home Assistant:
   Copy the following files to your Home Assistant www/crestron directory:
   - ${projectRoot}/homeassistant/polyfill_localstorage.js
   - ${projectRoot}/homeassistant/coldboot.html

   If using Home Assistant OS/Supervised:
   scp homeassistant/*.{js,html} homeassistant.local:/config/www/crestron/

2. Update Home Assistant configuration.yaml:
   Add the following configuration:

   ${this.generateHAConfig()}

3. Create tablet management dashboard:
   The script has generated a tablet-manager.yaml file that you can import
   into Home Assistant as a custom dashboard.
   
   Copy to: /config/dashboards/tablet-manager.yaml

4. Restart Home Assistant:
   After making these changes, restart Home Assistant for them to take effect.

5. Deploy to tablets:
   Use the deployment commands to push the app to your tablets:
   
   npm run deploy:all      # Deploy to all enabled tablets
   npm run deploy:list     # List all configured tablets
   npm run deploy:single <tablet-name>  # Deploy to specific tablet

📱 Configured Tablets:
${this.listConfiguredTablets()}

🔗 MQTT Topics for Automations:
   Each tablet exposes the following MQTT topics for automation:
   
   ${this.deploymentConfig.global.mqtt.base_topic}/<tablet_name>/hardButton/<button>/press
   ${this.deploymentConfig.global.mqtt.base_topic}/<tablet_name>/hardButton/<button>/active
   ${this.deploymentConfig.global.mqtt.base_topic}/<tablet_name>/hardButton/brightness
   
   Buttons: BUTTON_POWER, BUTTON_HOME, BUTTON_LIGHTBULB, BUTTON_UP, BUTTON_DOWN

═══════════════════════════════════════════════════════════════════
    `);
  }

  generateHAConfig() {
    return `frontend:
  extra_module_url:
    - /local/crestron/polyfill_localstorage.js

http:
  use_x_frame_options: false

# Optional: Add MQTT discovery for tablets
mqtt:
  discovery: true
  discovery_prefix: homeassistant`;
  }

  listConfiguredTablets() {
    const tablets = Object.entries(this.deploymentConfig.deployments)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => `   • ${name}: ${config.location} (${config.profile} @ ${config.hostname})`)
      .join('\n');
    
    return tablets || '   No tablets configured';
  }

  generateTabletDashboard() {
    const dashboardConfig = {
      title: "Tablet Manager",
      views: [
        {
          title: "Overview",
          path: "overview",
          cards: [
            {
              type: "markdown",
              content: "# Crestron Tablet Fleet Management\n\nManage and monitor your Crestron tablets from this dashboard."
            },
            {
              type: "entities",
              title: "Global Settings",
              entities: [
                {
                  entity: "input_boolean.tablet_auto_update",
                  name: "Auto Update Enabled"
                },
                {
                  entity: "input_select.tablet_update_schedule",
                  name: "Update Schedule"
                }
              ]
            }
          ]
        },
        {
          title: "Tablets",
          path: "tablets",
          cards: this.generateTabletCards()
        },
        {
          title: "Updates",
          path: "updates",
          cards: [
            {
              type: "markdown",
              content: "# Firmware Updates\n\nDeploy updates to your tablet fleet."
            },
            {
              type: "button",
              name: "Check for Updates",
              tap_action: {
                action: "call-service",
                service: "script.check_tablet_updates"
              }
            },
            {
              type: "button",
              name: "Deploy All Updates",
              tap_action: {
                action: "call-service",
                service: "script.deploy_tablet_updates"
              }
            }
          ]
        }
      ]
    };

    const yamlPath = path.join(projectRoot, 'homeassistant/tablet-manager.yaml');
    
    // Convert to YAML format (simplified)
    const yamlContent = this.objectToYaml(dashboardConfig);
    fs.writeFileSync(yamlPath, yamlContent);
    
    console.log(`   ✅ Generated tablet dashboard configuration at: ${yamlPath}`);
  }

  generateTabletCards() {
    return Object.entries(this.deploymentConfig.deployments)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({
        type: "entities",
        title: `${config.location} (${config.profile})`,
        entities: [
          {
            entity: `sensor.tablet_${name}_status`,
            name: "Status"
          },
          {
            entity: `sensor.tablet_${name}_uptime`,
            name: "Uptime"
          },
          {
            entity: `switch.tablet_${name}_display`,
            name: "Display"
          },
          {
            entity: `light.tablet_${name}_buttons`,
            name: "Button LEDs"
          }
        ]
      }));
  }

  objectToYaml(obj, indent = 0) {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}:\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.objectToYaml(item, indent + 4).split('\n')
              .map(line => line ? `${' '.repeat(indent + 2)}${line}` : '')
              .join('\n');
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYaml(value, indent + 2);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
    
    return yaml;
  }

  generateMQTTSensors() {
    const sensors = [];
    
    Object.entries(this.deploymentConfig.deployments)
      .filter(([_, config]) => config.enabled)
      .forEach(([name, config]) => {
        const baseTopic = `${this.deploymentConfig.global.mqtt.base_topic}/${config.mqtt.topic_prefix || name}`;
        
        // Status sensor
        sensors.push({
          platform: "mqtt",
          name: `tablet_${name}_status`,
          state_topic: `${baseTopic}/status`,
          device_class: "connectivity",
          payload_on: "online",
          payload_off: "offline"
        });
        
        // Display sensor
        sensors.push({
          platform: "mqtt",
          name: `tablet_${name}_display`,
          state_topic: `${baseTopic}/display/power`,
          command_topic: `${baseTopic}/display/power/set`,
          payload_on: "true",
          payload_off: "false"
        });
        
        // Button LED brightness
        sensors.push({
          platform: "mqtt",
          schema: "json",
          name: `tablet_${name}_buttons`,
          state_topic: `${baseTopic}/hardButton/brightness`,
          command_topic: `${baseTopic}/hardButton/brightness/set`,
          brightness: true,
          brightness_scale: 65535
        });
        
        // Individual button sensors
        ['BUTTON_POWER', 'BUTTON_HOME', 'BUTTON_LIGHTBULB', 'BUTTON_UP', 'BUTTON_DOWN'].forEach(button => {
          sensors.push({
            platform: "mqtt",
            name: `tablet_${name}_${button.toLowerCase()}`,
            state_topic: `${baseTopic}/hardButton/${button}/press`,
            device_class: "button"
          });
        });
      });
    
    const sensorsPath = path.join(projectRoot, 'homeassistant/mqtt-sensors.yaml');
    fs.writeFileSync(sensorsPath, this.objectToYaml(sensors));
    
    console.log(`   ✅ Generated MQTT sensor configuration at: ${sensorsPath}`);
  }

  run() {
    console.log('🏠 Setting up Home Assistant integration...\n');
    
    // Check if polyfill is compiled
    const polyfillJs = path.join(projectRoot, 'homeassistant/polyfill_localstorage.js');
    if (!fs.existsSync(polyfillJs)) {
      console.error('❌ Polyfill not compiled. Run "npm run build:polyfill" first.');
      process.exit(1);
    }
    
    // Generate dashboard and sensor configurations
    this.generateTabletDashboard();
    this.generateMQTTSensors();
    
    // Show setup instructions
    this.generateInstructions();
  }
}

const setup = new HomeAssistantSetup();
setup.run();