#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class TabletDeploymentManager {
  constructor() {
    this.deploymentConfig = this.loadConfig('config/deployment-config.json');
    this.tabletProfiles = this.loadConfig('config/tablet-profiles.json');
    this.deploymentResults = [];
  }

  loadConfig(configPath) {
    const fullPath = path.join(projectRoot, configPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Configuration file not found: ${fullPath}`);
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }

  async deployAll() {
    console.log('🚀 Starting multi-tablet deployment...\n');
    
    const deployments = Object.entries(this.deploymentConfig.deployments)
      .filter(([_, config]) => config.enabled);
    
    if (deployments.length === 0) {
      console.log('No enabled deployments found in configuration.');
      return;
    }

    console.log(`Found ${deployments.length} enabled deployment(s)\n`);

    for (const [name, config] of deployments) {
      await this.deployToTablet(name, config);
    }

    this.printSummary();
  }

  async deployToTablet(name, config) {
    console.log(`📱 Deploying to ${name} (${config.location})`);
    console.log(`   Profile: ${config.profile}`);
    console.log(`   Host: ${config.hostname}`);
    
    try {
      // Step 1: Create custom .env file for this tablet
      const envContent = this.generateEnvFile(config);
      const envPath = path.join(projectRoot, `.env.${name}`);
      fs.writeFileSync(envPath, envContent);
      
      // Step 2: Build with custom configuration
      console.log(`   Building application...`);
      this.buildApplication(name);
      
      // Step 3: Create CH5Z archive
      console.log(`   Creating CH5Z archive...`);
      this.createArchive(name);
      
      // Step 4: Deploy to tablet
      console.log(`   Deploying to tablet...`);
      this.deployArchive(name, config);
      
      // Step 5: Clean up temporary files
      fs.unlinkSync(envPath);
      
      console.log(`   ✅ Successfully deployed to ${name}\n`);
      this.deploymentResults.push({ name, status: 'success' });
      
    } catch (error) {
      console.error(`   ❌ Failed to deploy to ${name}: ${error.message}\n`);
      this.deploymentResults.push({ name, status: 'failed', error: error.message });
    }
  }

  generateEnvFile(config) {
    const profile = this.tabletProfiles.profiles[config.profile];
    const global = this.deploymentConfig.global;
    
    const dashboardUrl = `${global.home_assistant.url}${global.home_assistant.coldboot_path}?redirect_to=${config.ha_dashboard}`;
    
    return `# Auto-generated environment file for ${config.location}
VITE_MQTT_URL="${global.mqtt.broker}"
VITE_MQTT_USERNAME="${global.mqtt.username}"
VITE_MQTT_PASSWORD="${global.mqtt.password}"
VITE_HA_DASHBOARD_URL="${dashboardUrl}"
VITE_TABLET_PROFILE="${config.profile}"
VITE_TABLET_SERIAL="${config.serial}"
VITE_TABLET_LOCATION="${config.location}"
VITE_MQTT_TOPIC_PREFIX="${config.mqtt.topic_prefix || config.serial}"
VITE_DEVICE_PIXEL_RATIO="${profile.devicePixelRatio}"
VITE_CAMERA_ENABLED="${profile.features.camera}"
VITE_UPDATE_SERVER="${global.update.update_server}"
VITE_AUTO_UPDATE="${global.update.auto_update}"
`;
  }

  buildApplication(name) {
    try {
      process.env.NODE_ENV = 'production';
      execSync(`npm run build:prod`, {
        cwd: projectRoot,
        env: { ...process.env, DEPLOYMENT_NAME: name },
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  createArchive(name) {
    try {
      const archiveName = `ch5-ha-bridge-${name}`;
      execSync(`ch5-cli archive -p ${archiveName} -d dist -o archive`, {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Archive creation failed: ${error.message}`);
    }
  }

  deployArchive(name, config) {
    const archivePath = path.join(projectRoot, 'archive', `ch5-ha-bridge-${name}.ch5z`);
    
    // Check if archive exists
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive file not found: ${archivePath}`);
    }
    
    // Build deployment command based on available credentials
    let deployCmd = `ch5-cli deploy -H ${config.hostname} -t touchscreen ${archivePath} --slow-mode`;
    
    // Add credentials if available in config
    if (config.credentials) {
      if (config.credentials.username) {
        deployCmd += ` -u ${config.credentials.username}`;
      }
      if (config.credentials.identity_file) {
        deployCmd += ` -i ${config.credentials.identity_file}`;
      }
    } else {
      // Try with default Crestron credentials
      deployCmd += ` -u crestron`;
    }
    
    try {
      execSync(deployCmd, {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (error) {
      // If deployment fails, provide manual instructions
      console.log(`\n   ⚠️  Automated deployment failed. Archive created successfully at:`);
      console.log(`      ${archivePath}`);
      console.log(`\n   Manual deployment options:`);
      console.log(`   1. Using ch5-cli with credentials:`);
      console.log(`      ch5-cli deploy -p -H ${config.hostname} -t touchscreen ${archivePath}`);
      console.log(`\n   2. Using Crestron Toolbox:`);
      console.log(`      - Open Crestron Toolbox`);
      console.log(`      - Connect to ${config.hostname}`);
      console.log(`      - Navigate to File Manager`);
      console.log(`      - Upload ${path.basename(archivePath)} to /display/`);
      console.log(`\n   3. Using Web Interface (if available):`);
      console.log(`      - Navigate to http://${config.hostname}`);
      console.log(`      - Login with credentials`);
      console.log(`      - Upload the CH5Z file\n`);
      
      throw new Error(`Automated deployment requires SSH key or manual intervention`);
    }
  }

  async deploySingle(tabletName) {
    const config = this.deploymentConfig.deployments[tabletName];
    
    if (!config) {
      console.error(`Tablet configuration '${tabletName}' not found.`);
      process.exit(1);
    }
    
    if (!config.enabled) {
      console.log(`Tablet '${tabletName}' is disabled in configuration.`);
      return;
    }
    
    await this.deployToTablet(tabletName, config);
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Deployment Summary:');
    console.log('═'.repeat(40));
    
    const successful = this.deploymentResults.filter(r => r.status === 'success');
    const failed = this.deploymentResults.filter(r => r.status === 'failed');
    
    if (successful.length > 0) {
      console.log(`✅ Successful: ${successful.length}`);
      successful.forEach(r => console.log(`   - ${r.name}`));
    }
    
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}`);
      failed.forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    console.log('═'.repeat(40));
  }

  listTablets() {
    console.log('\n📱 Configured Tablets:');
    console.log('═'.repeat(60));
    
    Object.entries(this.deploymentConfig.deployments).forEach(([name, config]) => {
      const status = config.enabled ? '✅ Enabled' : '⏸️  Disabled';
      console.log(`\n${name}:`);
      console.log(`  Status: ${status}`);
      console.log(`  Profile: ${config.profile}`);
      console.log(`  Location: ${config.location}`);
      console.log(`  IP: ${config.hostname}`);
      console.log(`  Dashboard: ${config.ha_dashboard}`);
    });
    
    console.log('\n' + '═'.repeat(60));
  }
}

// CLI Interface
const manager = new TabletDeploymentManager();
const command = process.argv[2];
const tabletName = process.argv[3];

switch(command) {
  case 'deploy-all':
    manager.deployAll();
    break;
  case 'deploy':
    if (!tabletName) {
      console.error('Please specify a tablet name to deploy to.');
      console.log('Usage: npm run deploy:single <tablet-name>');
      process.exit(1);
    }
    manager.deploySingle(tabletName);
    break;
  case 'list':
    manager.listTablets();
    break;
  default:
    console.log(`
Crestron CH5 HA Bridge - Deployment Manager

Commands:
  deploy-all     Deploy to all enabled tablets
  deploy <name>  Deploy to a specific tablet
  list           List all configured tablets

Examples:
  node scripts/deploy-manager.js deploy-all
  node scripts/deploy-manager.js deploy livingroom
  node scripts/deploy-manager.js list
    `);
}