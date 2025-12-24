#!/bin/bash

# Quick production status check script

echo "🔍 Checking production status..."

# 1. Check if production container is running
echo ""
echo "📦 Container Status:"
docker ps | grep uflow-app || echo "❌ Production container not running!"

# 2. Check container logs
echo ""
echo "📋 Container Logs (last 20 lines):"
docker logs uflow-app --tail 20 2>/dev/null || echo "❌ Cannot access container logs"

# 3. Check if port 3000 is in use
echo ""
echo "🔌 Port 3000 Status:"
netstat -tuln | grep :3000 || echo "⚠️  Port 3000 not in use"

# 4. Check Nginx status
echo ""
echo "🌐 Nginx Status:"
systemctl status nginx --no-pager -l | head -15

# 5. Check Nginx error logs
echo ""
echo "📋 Nginx Error Logs (last 10 lines):"
tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Cannot access Nginx logs"

# 6. Test local connection
echo ""
echo "🧪 Testing local connection:"
curl -I http://localhost:3000 2>&1 | head -5 || echo "❌ Cannot connect to localhost:3000"

# 7. Check if container is healthy
echo ""
echo "💚 Container Health:"
docker inspect uflow-app --format='{{.State.Status}}' 2>/dev/null || echo "Container not found"

