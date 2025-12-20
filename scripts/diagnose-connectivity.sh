#!/bin/bash

# Connectivity Diagnostic Script
# Diagnoses why ummahflow.com and uat.ummahflow.com are not accessible

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Diagnosing connectivity issues for ummahflow.com and uat.ummahflow.com...${NC}"
echo ""

# Check if running on server
if [ ! -f "/etc/nginx/nginx.conf" ]; then
    echo -e "${YELLOW}⚠️  This script should be run on the Hetzner server${NC}"
    echo "SSH into the server first: ssh root@91.98.207.106"
    exit 1
fi

SERVER_IP="91.98.207.106"
PROD_DOMAIN="ummahflow.com"
UAT_DOMAIN="uat.ummahflow.com"

echo -e "${BLUE}=== DNS CHECK ===${NC}"

# Check DNS resolution
echo "Checking DNS resolution for $PROD_DOMAIN..."
PROD_IP=$(dig +short $PROD_DOMAIN | tail -1)
if [ -z "$PROD_IP" ]; then
    echo -e "${RED}❌ $PROD_DOMAIN does not resolve to any IP${NC}"
    echo "   Action: Check DNS A record points to $SERVER_IP"
else
    if [ "$PROD_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✅ $PROD_DOMAIN resolves to $SERVER_IP${NC}"
    else
        echo -e "${YELLOW}⚠️  $PROD_DOMAIN resolves to $PROD_IP (expected $SERVER_IP)${NC}"
    fi
fi

echo ""
echo "Checking DNS resolution for $UAT_DOMAIN..."
UAT_IP=$(dig +short $UAT_DOMAIN | tail -1)
if [ -z "$UAT_IP" ]; then
    echo -e "${RED}❌ $UAT_DOMAIN does not resolve to any IP${NC}"
    echo "   Action: Check DNS A record points to $SERVER_IP"
else
    if [ "$UAT_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✅ $UAT_DOMAIN resolves to $SERVER_IP${NC}"
    else
        echo -e "${YELLOW}⚠️  $UAT_DOMAIN resolves to $UAT_IP (expected $SERVER_IP)${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== NGINX STATUS ===${NC}"

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
    echo "   Action: sudo systemctl start nginx"
fi

# Check Nginx configuration
echo ""
echo "Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    sudo nginx -t
fi

# Check if sites are enabled
echo ""
echo "Checking enabled Nginx sites..."
if [ -L "/etc/nginx/sites-enabled/ummahflow" ] || [ -L "/etc/nginx/sites-enabled/ummahflow.com" ]; then
    echo -e "${GREEN}✅ Production site is enabled${NC}"
else
    echo -e "${RED}❌ Production site is NOT enabled${NC}"
    echo "   Action: Check /etc/nginx/sites-available/ for production config"
fi

if [ -L "/etc/nginx/sites-enabled/uat-ummahflow" ]; then
    echo -e "${GREEN}✅ UAT site is enabled${NC}"
else
    echo -e "${RED}❌ UAT site is NOT enabled${NC}"
    echo "   Action: sudo ln -s /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow"
fi

# Check SSL certificates
echo ""
echo -e "${BLUE}=== SSL CERTIFICATES ===${NC}"

if [ -f "/etc/letsencrypt/live/$PROD_DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$PROD_DOMAIN/fullchain.pem | cut -d= -f2)
    echo -e "${GREEN}✅ Production SSL certificate exists (expires: $CERT_EXPIRY)${NC}"
else
    echo -e "${RED}❌ Production SSL certificate NOT found${NC}"
    echo "   Action: sudo certbot --nginx -d $PROD_DOMAIN -d www.$PROD_DOMAIN"
fi

if [ -f "/etc/letsencrypt/live/$UAT_DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$UAT_DOMAIN/fullchain.pem | cut -d= -f2)
    echo -e "${GREEN}✅ UAT SSL certificate exists (expires: $CERT_EXPIRY)${NC}"
else
    echo -e "${RED}❌ UAT SSL certificate NOT found${NC}"
    echo "   Action: sudo certbot --nginx -d $UAT_DOMAIN"
fi

echo ""
echo -e "${BLUE}=== DOCKER CONTAINERS ===${NC}"

# Check Docker containers
if docker ps | grep -q "uflow"; then
    echo -e "${GREEN}✅ Production container (uflow) is running${NC}"
    docker ps | grep uflow | grep -v uat
else
    echo -e "${RED}❌ Production container (uflow) is NOT running${NC}"
    echo "   Action: Check logs with: docker logs uflow"
fi

if docker ps | grep -q "uflow-uat"; then
    echo -e "${GREEN}✅ UAT container (uflow-uat) is running${NC}"
    docker ps | grep uflow-uat
else
    echo -e "${RED}❌ UAT container (uflow-uat) is NOT running${NC}"
    echo "   Action: Check logs with: docker logs uflow-uat"
fi

# Check ports
echo ""
echo -e "${BLUE}=== PORT LISTENING ===${NC}"

if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✅ Port 3000 is listening (production)${NC}"
else
    echo -e "${RED}❌ Port 3000 is NOT listening${NC}"
    echo "   Action: Start production container"
fi

if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✅ Port 3001 is listening (UAT)${NC}"
else
    echo -e "${RED}❌ Port 3001 is NOT listening${NC}"
    echo "   Action: Start UAT container"
fi

# Check if ports 80 and 443 are listening
if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    echo -e "${GREEN}✅ Port 80 is listening (HTTP)${NC}"
else
    echo -e "${RED}❌ Port 80 is NOT listening${NC}"
fi

if netstat -tlnp 2>/dev/null | grep -q ":443"; then
    echo -e "${GREEN}✅ Port 443 is listening (HTTPS)${NC}"
else
    echo -e "${RED}❌ Port 443 is NOT listening${NC}"
fi

echo ""
echo -e "${BLUE}=== FIREWALL CHECK ===${NC}"

# Check firewall (ufw)
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(ufw status | head -1)
    echo "Firewall status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "inactive"; then
        echo -e "${YELLOW}⚠️  Firewall is inactive${NC}"
    else
        if ufw status | grep -q "80/tcp"; then
            echo -e "${GREEN}✅ Port 80 is allowed in firewall${NC}"
        else
            echo -e "${RED}❌ Port 80 is NOT allowed in firewall${NC}"
            echo "   Action: sudo ufw allow 80/tcp"
        fi
        
        if ufw status | grep -q "443/tcp"; then
            echo -e "${GREEN}✅ Port 443 is allowed in firewall${NC}"
        else
            echo -e "${RED}❌ Port 443 is NOT allowed in firewall${NC}"
            echo "   Action: sudo ufw allow 443/tcp"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  UFW not found, checking iptables...${NC}"
fi

# Check iptables
if iptables -L -n | grep -q "ACCEPT.*tcp.*80"; then
    echo -e "${GREEN}✅ Port 80 is allowed in iptables${NC}"
else
    echo -e "${YELLOW}⚠️  Port 80 may not be explicitly allowed in iptables${NC}"
fi

if iptables -L -n | grep -q "ACCEPT.*tcp.*443"; then
    echo -e "${GREEN}✅ Port 443 is allowed in iptables${NC}"
else
    echo -e "${YELLOW}⚠️  Port 443 may not be explicitly allowed in iptables${NC}"
fi

echo ""
echo -e "${BLUE}=== LOCAL HEALTH CHECKS ===${NC}"

# Test local endpoints
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Production health check (localhost:3000) passed${NC}"
else
    echo -e "${RED}❌ Production health check (localhost:3000) failed${NC}"
    echo "   Action: Check container logs: docker logs uflow"
fi

if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ UAT health check (localhost:3001) passed${NC}"
else
    echo -e "${RED}❌ UAT health check (localhost:3001) failed${NC}"
    echo "   Action: Check container logs: docker logs uflow-uat"
fi

echo ""
echo -e "${BLUE}=== SUMMARY ===${NC}"
echo "Run this script on the Hetzner server to diagnose connectivity issues."
echo "Common fixes:"
echo "  1. DNS: Ensure A records point to $SERVER_IP"
echo "  2. Nginx: sudo systemctl start nginx && sudo systemctl reload nginx"
echo "  3. SSL: sudo certbot --nginx -d $PROD_DOMAIN -d $UAT_DOMAIN"
echo "  4. Containers: ./scripts/deploy-hetzner.sh and ./scripts/deploy-uat.sh"
echo "  5. Firewall: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"









