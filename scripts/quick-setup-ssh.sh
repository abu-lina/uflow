#!/bin/bash

# Quick script to setup SSH authentication on Hetzner
echo "🔐 Setting up SSH authentication for GitHub on Hetzner"
echo "======================================================"
echo ""
echo "This will:"
echo "1. Generate an SSH key on your Hetzner server"
echo "2. Show you the public key to add to GitHub"
echo "3. Update git remote to use SSH"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "📝 Step 1: Generating SSH key on server..."
ssh root@91.98.207.106 << 'EOF'
    if [ ! -f ~/.ssh/id_ed25519 ]; then
        ssh-keygen -t ed25519 -C "hetzner-uflow-server" -f ~/.ssh/id_ed25519 -N ""
        echo "✅ SSH key generated!"
    else
        echo "✅ SSH key already exists!"
    fi
    
    echo ""
    echo "📋 Your PUBLIC KEY (copy this entire block):"
    echo "================================================"
    cat ~/.ssh/id_ed25519.pub
    echo "================================================"
EOF

echo ""
echo "🌐 Step 2: Add this key to GitHub"
echo "1. Copy the key above"
echo "2. Go to: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Title: Hetzner uFlow Server"
echo "5. Paste the key"
echo "6. Click 'Add SSH key'"
echo ""
read -p "Press Enter after you've added the key to GitHub..."

echo ""
echo "🔧 Step 3: Updating git remote to use SSH..."
ssh root@91.98.207.106 << 'EOF'
    cd /var/www/uflow
    
    echo "Current remote:"
    git remote -v
    
    echo ""
    echo "Changing to SSH..."
    git remote set-url origin git@github.com:abu-lina/uflow.git
    
    echo ""
    echo "New remote:"
    git remote -v
    
    echo ""
    echo "Testing SSH connection to GitHub..."
    ssh -T git@github.com 2>&1 | head -n 1
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "🧪 Test by pulling from GitHub:"
echo "   ssh root@91.98.207.106"
echo "   cd /var/www/uflow"
echo "   git pull"

