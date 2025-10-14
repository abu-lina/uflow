#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 UmmahFlow App Monitoring${NC}"
echo "=================================="

# Check if app is running
echo -e "${YELLOW}🔍 Checking app status...${NC}"
if docker ps | grep -q uflow-app; then
    echo -e "${GREEN}✅ App container is running${NC}"
else
    echo -e "${RED}❌ App container is not running${NC}"
fi

# Check app health
echo -e "${YELLOW}🏥 Checking app health...${NC}"
HEALTH_STATUS=$(curl -s http://localhost:3000/api/health | jq -r '.status' 2>/dev/null || echo "unhealthy")
if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✅ App is healthy${NC}"
else
    echo -e "${RED}❌ App is unhealthy (Status: $HEALTH_STATUS)${NC}"
fi

# Check Nginx status
echo -e "${YELLOW}🌐 Checking Nginx status...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
fi

# Check SSL certificate
echo -e "${YELLOW}🔒 Checking SSL certificate...${NC}"
SSL_EXPIRY=$(echo | openssl s_client -servername ummahflow.com -connect ummahflow.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    echo -e "${GREEN}✅ SSL certificate expires: $SSL_EXPIRY${NC}"
else
    echo -e "${RED}❌ SSL certificate check failed${NC}"
fi

# Check static files
echo -e "${YELLOW}📁 Checking static files...${NC}"
STATIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://ummahflow.com/_next/static/css/app/layout.css")
if [ "$STATIC_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Static files serving correctly${NC}"
else
    echo -e "${RED}❌ Static files serving failed (HTTP $STATIC_STATUS)${NC}"
fi

# Check memory usage
echo -e "${YELLOW}💾 Checking memory usage...${NC}"
MEMORY_USAGE=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
echo -e "${BLUE}📊 Memory usage: $MEMORY_USAGE${NC}"

# Check disk usage
echo -e "${YELLOW}💿 Checking disk usage...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
echo -e "${BLUE}📊 Disk usage: $DISK_USAGE${NC}"

# Check recent logs
echo -e "${YELLOW}📝 Recent app logs (last 5 lines)...${NC}"
docker logs --tail 5 uflow-app 2>/dev/null || echo "No logs available"

echo "=================================="
echo -e "${BLUE}🏁 Monitoring complete!${NC}"
