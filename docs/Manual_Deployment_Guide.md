# Manual Deployment Guide

This guide explains how to manually deploy the CH5Z archives to your Crestron tablets when automated deployment is not available.

## Prerequisites

Your CH5Z archives have been successfully created in the `archive/` directory:
- `ch5-ha-bridge-GarageGolfSim.ch5z`
- `ch5-ha-bridge-GarageTablet.ch5z`
- `ch5-ha-bridge-JonathanDeskTablet.ch5z`

## Deployment Methods

### Method 1: Using CH5-CLI with Interactive Login

This is the recommended method if you have the tablet credentials:

```bash
# For GarageGolfSim tablet
ch5-cli deploy -p -H 192.168.7.154 -t touchscreen archive/ch5-ha-bridge-GarageGolfSim.ch5z

# For GarageTablet
ch5-cli deploy -p -H 192.168.7.152 -t touchscreen archive/ch5-ha-bridge-GarageTablet.ch5z

# For JonathanDeskTablet
ch5-cli deploy -p -H 192.168.7.212 -t touchscreen archive/ch5-ha-bridge-JonathanDeskTablet.ch5z
```

When prompted, enter:
- Username: `crestron` (default) or your configured username
- Password: Your tablet password

### Method 2: Using Crestron Toolbox

1. **Download and Install Crestron Toolbox**
   - Available from Crestron website (requires account)

2. **Connect to Tablet**
   - Open Crestron Toolbox
   - Click "Device Discovery" or manually add device
   - Enter tablet IP address:
     - GarageGolfSim: `192.168.7.154`
     - GarageTablet: `192.168.7.152`
     - JonathanDeskTablet: `192.168.7.212`

3. **Upload CH5Z File**
   - Navigate to "File Manager"
   - Browse to `/display/` directory
   - Upload the appropriate CH5Z file for each tablet
   - The application will automatically extract and install

### Method 3: Using Web Interface

If your tablets have web management enabled:

1. **Access Web Interface**
   - Open browser and navigate to:
     - GarageGolfSim: `http://192.168.7.154`
     - GarageTablet: `http://192.168.7.152`
     - JonathanDeskTablet: `http://192.168.7.212`

2. **Login**
   - Default credentials:
     - Username: `admin` or `crestron`
     - Password: (check your tablet documentation)

3. **Upload Application**
   - Navigate to "Applications" or "File Manager"
   - Upload the CH5Z file
   - The tablet will automatically install the application

### Method 4: Using SFTP/SCP

If SSH/SFTP access is enabled:

```bash
# Using SCP
scp archive/ch5-ha-bridge-GarageGolfSim.ch5z crestron@192.168.7.154:/display/

# Using SFTP
sftp crestron@192.168.7.154
sftp> cd /display
sftp> put archive/ch5-ha-bridge-GarageGolfSim.ch5z
sftp> exit
```

## Setting Up Automated Deployment

To enable automated deployment for future updates:

1. **Generate SSH Key**
   ```bash
   ./scripts/setup-deployment-auth.sh
   ```

2. **Copy SSH Key to Tablets**
   ```bash
   ssh-copy-id -i ~/.ssh/crestron_tablet crestron@192.168.7.154
   ssh-copy-id -i ~/.ssh/crestron_tablet crestron@192.168.7.152
   ssh-copy-id -i ~/.ssh/crestron_tablet crestron@192.168.7.212
   ```

3. **Update Configuration**
   
   Edit `config/deployment-config.json` and add credentials to each tablet:
   ```json
   {
     "GarageGolfSim": {
       "enabled": true,
       "hostname": "192.168.7.154",
       "credentials": {
         "username": "crestron",
         "identity_file": "~/.ssh/crestron_tablet"
       }
       // ... rest of config
     }
   }
   ```

4. **Test Automated Deployment**
   ```bash
   npm run deploy:single GarageGolfSim
   ```

## Verification

After deployment, verify the application is running:

1. **Check Tablet Display**
   - The application should launch automatically
   - You should see the Home Assistant dashboard

2. **Check MQTT Connection**
   - In Home Assistant, check for new devices under:
     - Settings → Devices & Services → MQTT
   - Look for devices named after your tablets

3. **Test Hardware Buttons**
   - Press physical buttons on the tablet
   - Check if button events appear in Home Assistant

## Troubleshooting

### Application Not Starting
- Ensure CH5Z file was uploaded to `/display/` directory
- Restart the tablet application
- Check tablet logs for errors

### MQTT Not Connecting
- Verify MQTT broker settings in deployment config
- Check network connectivity from tablet
- Ensure MQTT credentials are correct

### Display Issues
- Clear tablet browser cache
- Restart the tablet
- Re-upload the CH5Z file

## Default Credentials

Common default credentials for Crestron tablets:
- Username: `crestron` / Password: (blank or `crestron`)
- Username: `admin` / Password: `admin`
- Username: `administrator` / Password: (device serial number)

> **Note**: Always change default credentials for security

## Support

For additional help:
- Check tablet documentation from Crestron
- Review the [Installation Guide](Installation_Guide.md)
- Check GitHub issues for known problems