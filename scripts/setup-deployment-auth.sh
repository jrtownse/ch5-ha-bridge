#!/bin/bash

# Crestron CH5 HA Bridge - Deployment Authentication Setup
# This script helps set up SSH keys for automated deployment to Crestron tablets

echo "======================================"
echo "Crestron Tablet SSH Key Setup"
echo "======================================"
echo ""

# Check if SSH key already exists
SSH_KEY_PATH="$HOME/.ssh/crestron_tablet"

if [ -f "$SSH_KEY_PATH" ]; then
    echo "✅ SSH key already exists at: $SSH_KEY_PATH"
    echo ""
    read -p "Do you want to generate a new key? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing SSH key."
    else
        echo "Generating new SSH key..."
        ssh-keygen -t rsa -b 2048 -f "$SSH_KEY_PATH" -N "" -C "crestron-tablet-deployment"
    fi
else
    echo "Generating new SSH key for Crestron tablets..."
    ssh-keygen -t rsa -b 2048 -f "$SSH_KEY_PATH" -N "" -C "crestron-tablet-deployment"
fi

echo ""
echo "SSH key ready at: $SSH_KEY_PATH"
echo ""
echo "======================================"
echo "Manual Setup Instructions:"
echo "======================================"
echo ""
echo "For each tablet, you need to:"
echo ""
echo "1. Copy the public key to the tablet:"
echo "   ssh-copy-id -i $SSH_KEY_PATH crestron@<TABLET_IP>"
echo ""
echo "2. Test the connection:"
echo "   ssh -i $SSH_KEY_PATH crestron@<TABLET_IP> 'echo Connected successfully'"
echo ""
echo "3. Add credentials to deployment-config.json:"
echo '   "credentials": {'
echo '     "username": "crestron",'
echo "     \"identity_file\": \"$SSH_KEY_PATH\""
echo '   }'
echo ""
echo "======================================"
echo "Configured Tablets:"
echo "======================================"

# Read tablet IPs from deployment config
if [ -f "config/deployment-config.json" ]; then
    echo ""
    # Extract enabled tablets with their IPs
    node -e "
        const config = require('./config/deployment-config.json');
        Object.entries(config.deployments)
            .filter(([_, cfg]) => cfg.enabled)
            .forEach(([name, cfg]) => {
                console.log(\`\${name} - \${cfg.hostname}\`);
                console.log(\`  ssh-copy-id -i $SSH_KEY_PATH crestron@\${cfg.hostname}\`);
                console.log('');
            });
    "
fi

echo "======================================"
echo ""
echo "Once SSH keys are set up, the deployment"
echo "will work without password prompts."
echo ""