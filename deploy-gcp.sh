#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# RapClouds — GCP Deployment Script
# Target: GCP e2-micro VM (1 vCPU, 1GB RAM) — Free Tier eligible
# App:    rapclouds.jordanchristley.com
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Auto-detect script directory ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_NAME="rapclouds"
APP_DIR="${APP_DIR:-/opt/rapclouds}"
VENV_DIR="${APP_DIR}/venv"
SERVICE_NAME="rapclouds"
PORT=8000
NODE_VERSION="20"

echo "═══════════════════════════════════════════════════════════════"
echo "  RapClouds GCP Deployment"
echo "═══════════════════════════════════════════════════════════════"

# ─── 0. Check if running as root ──────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This script must be run as root (or with sudo)"
    exit 1
fi

# ─── 1. System dependencies ────────────────────────────────────────
echo ""
echo "▶ Installing system dependencies..."

apt-get update -qq
apt-get install -y -qq \
    python3 python3-pip python3-venv \
    ffmpeg git curl wget unzip \
    build-essential \
    libjpeg-dev zlib1g-dev \
    fonts-dejavu-core 2>/dev/null || true

echo "  ✓ Python: $(python3 --version 2>&1)"
echo "  ✓ ffmpeg: $(ffmpeg -version 2>&1 | head -1)"

# ─── 2. Node.js (for frontend build) ──────────────────────────────
echo ""
echo "▶ Installing Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt "$NODE_VERSION" ]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs 2>/dev/null || true
fi
echo "  ✓ Node: $(node --version)"
echo "  ✓ npm: $(npm --version)"

# ─── 3. yt-dlp ─────────────────────────────────────────────────────
echo ""
echo "▶ Installing yt-dlp..."
if ! command -v yt-dlp &>/dev/null; then
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
fi
echo "  ✓ yt-dlp: $(yt-dlp --version)"

# ─── 4. cloudflared ────────────────────────────────────────────────
echo ""
echo "▶ Installing cloudflared..."
if ! command -v cloudflared &>/dev/null; then
    ARCH=$(uname -m)
    case "$ARCH" in
        aarch64|arm64) CF_ARCH="arm64" ;;
        x86_64)        CF_ARCH="amd64" ;;
        *)             echo "❌ Unsupported arch: $ARCH"; exit 1 ;;
    esac
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" \
        -o /usr/local/bin/cloudflared
    chmod a+rx /usr/local/bin/cloudflared
fi
echo "  ✓ cloudflared: $(cloudflared --version 2>&1 | head -1)"

# ─── 5. Doppler CLI (for secrets) ─────────────────────────────────
echo ""
echo "▶ Installing Doppler CLI..."
if ! command -v doppler &>/dev/null; then
    curl -fsSL https://cli.doppler.com/install.sh | sh
fi
echo "  ✓ doppler: $(doppler --version 2>&1 | head -1)"

# ─── 6. Create app directory structure ─────────────────────────────
echo ""
echo "▶ Setting up app directory..."
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/data/songs"
mkdir -p "${APP_DIR}/data/masks"
mkdir -p "${APP_DIR}/data/lyrics"
mkdir -p "${APP_DIR}/data/fonts"

# ─── 7. Copy application code ──────────────────────────────────────
echo ""
echo "▶ Copying application code..."

# Auto-detect source from script location, or use SOURCE_DIR env var.
if [ -d "${SCRIPT_DIR}/rapclouds-ui" ]; then
    SOURCE_DIR="${SCRIPT_DIR}"
elif [ -z "${SOURCE_DIR:-}" ] || [ ! -d "${SOURCE_DIR}" ]; then
    echo "  No SOURCE_DIR set and script not in repo root."
    echo "  Attempting git clone..."
    if [ ! -d "${APP_DIR}/rapclouds-ui" ]; then
        echo "  ⚠ Set SOURCE_DIR=/path/to/rapclouds repo and re-run, or"
        echo "    place this script in the rapclouds repo root."
        echo ""
        echo "  Examples:"
        echo "    bash deploy-gcp.sh                      # run from repo root"
        echo "    SOURCE_DIR=~/workspace/rapclouds bash deploy-gcp.sh"
        exit 1
    fi
else
    echo "  Using SOURCE_DIR: ${SOURCE_DIR}"
    echo "  Copying from ${SOURCE_DIR}..."
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
        "${SOURCE_DIR}/rapclouds-ui/" "${APP_DIR}/rapclouds-ui/"
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
        "${SOURCE_DIR}/standalone/" "${APP_DIR}/standalone/"
    rsync -av "${SOURCE_DIR}/requirements.txt" "${APP_DIR}/"
fi

# ─── 8. Copy data files ────────────────────────────────────────────
echo ""
echo "▶ Copying data files..."

# Songs
SONGS_SRC="${SOURCE_DIR:-${APP_DIR}}/karaoke-mvp/songs"
if [ -d "$SONGS_SRC" ]; then
    rsync -av "${SONGS_SRC}/" "${APP_DIR}/data/songs/"
    echo "  ✓ Songs copied"
elif [ -d "${APP_DIR}/data/songs" ] && [ "$(ls -A "${APP_DIR}/data/songs" 2>/dev/null)" ]; then
    echo "  ✓ Songs already present"
else
    echo "  ⚠ Songs directory not found at ${SONGS_SRC}"
fi

# Masks
MASKS_SRC="${SOURCE_DIR:-${APP_DIR}}/standalone/masks"
if [ -d "$MASKS_SRC" ]; then
    rsync -av "${MASKS_SRC}/" "${APP_DIR}/data/masks/"
    echo "  ✓ Masks copied"
fi

# Lyrics
LYRICS_SRC="${SOURCE_DIR:-${APP_DIR}}/standalone/lyrics"
if [ -d "$LYRICS_SRC" ]; then
    rsync -av "${LYRICS_SRC}/" "${APP_DIR}/data/lyrics/"
    echo "  ✓ Lyrics copied"
fi

# Fonts
FONTS_SRC="${SOURCE_DIR:-${APP_DIR}}/standalone/fonts"
if [ -d "$FONTS_SRC" ]; then
    rsync -av "${FONTS_SRC}/" "${APP_DIR}/data/fonts/"
    echo "  ✓ Fonts copied"
fi

# ─── 9. Python virtual environment + dependencies ──────────────────
echo ""
echo "▶ Setting up Python virtual environment..."
python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

echo "  Installing Python packages..."
pip install --upgrade pip setuptools wheel -q
if [ -f "${APP_DIR}/requirements.txt" ]; then
    pip install -r "${APP_DIR}/requirements.txt" -q
else
    pip install fastapi uvicorn wordcloud pillow numpy openai yt-dlp requests python-multipart -q
fi
echo "  ✓ Python packages installed"

# ─── 10. Build React frontend ───────────────────────────────────────
echo ""
echo "▶ Building React frontend..."
cd "${APP_DIR}/rapclouds-ui"
npm ci --prefer-offline 2>/dev/null || npm install
npm run build
echo "  ✓ Frontend built to dist/"

# ─── 11. Patch hardcoded paths in server ───────────────────────────
echo ""
echo "▶ Patching server paths for production..."

cat > "${APP_DIR}/rapclouds-ui/server/run_server.py" << 'SERVEREOF'
#!/usr/bin/env python3
"""Production launcher for RapClouds FastAPI server."""
import os
import sys

# Set production paths
os.environ.setdefault("RAPCLOUDS_BASE_DIR", "/opt/rapclouds")
os.environ.setdefault("KARAOKE_SONGS_DIR", "/opt/rapclouds/data/songs")
os.environ.setdefault("RAPCLOUDS_MASKS_DIR", "/opt/rapclouds/data/masks")
os.environ.setdefault("RAPCLOUDS_LYRICS_DIR", "/opt/rapclouds/data/lyrics")
os.environ.setdefault("RAPCLOUDS_FONTS_DIR", "/opt/rapclouds/data/fonts")
os.environ.setdefault("RAPCLOUDS_STANDALONE_DIR", "/opt/rapclouds/standalone")
os.environ.setdefault("RAPCLOUDS_GALLERY_DIR", "/opt/rapclouds/standalone/output_v7_batch")

# Add standalone to path for generate_layers_v7 import
standalone = os.environ["RAPCLOUDS_STANDALONE_DIR"]
if standalone not in sys.path:
    sys.path.insert(0, standalone)

# Import and run
import uvicorn
from main import app

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        workers=1,  # Single worker for e2-micro (1GB RAM)
        log_level="info",
    )
SERVEREOF

chmod +x "${APP_DIR}/rapclouds-ui/server/run_server.py"
echo "  ✓ Production launcher created"

# ─── 12. Create systemd service ────────────────────────────────────
echo ""
echo "▶ Creating systemd service..."

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=RapClouds FastAPI Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/rapclouds-ui/server
Environment="PATH=${VENV_DIR}/bin:/usr/local/bin:/usr/bin"
Environment="PYTHONPATH=${APP_DIR}/rapclouds-ui/server:${APP_DIR}/standalone"
Environment="RAPCLOUDS_BASE_DIR=${APP_DIR}"
Environment="KARAOKE_SONGS_DIR=${APP_DIR}/data/songs"
Environment="RAPCLOUDS_MASKS_DIR=${APP_DIR}/data/masks"
Environment="RAPCLOUDS_LYRICS_DIR=${APP_DIR}/data/lyrics"
Environment="RAPCLOUDS_FONTS_DIR=${APP_DIR}/data/fonts"
Environment="RAPCLOUDS_STANDALONE_DIR=${APP_DIR}/standalone"
Environment="RAPCLOUDS_GALLERY_DIR=${APP_DIR}/standalone/output_v7_batch"
Environment="PORT=${PORT}"
# Secrets via Doppler: EnvironmentFile=-/etc/rapclouds.env
ExecStart=${VENV_DIR}/bin/python run_server.py
Restart=always
RestartSec=5
# Memory limits for e2-micro
MemoryMax=800M
MemoryHigh=600M

[Install]
WantedBy=multi-user.target
EOF

# Create env file template for secrets (fallback if Doppler not configured)
if [ ! -f /etc/rapclouds.env ]; then
    cat > /etc/rapclouds.env << 'EOF'
# RapClouds environment variables
# Edit this file to set your API keys
# Or configure Doppler: doppler setup
OPENAI_API_KEY=
EOF
    chmod 600 /etc/rapclouds.env
    echo "  ⚠ Created /etc/rapclouds.env — edit it to set OPENAI_API_KEY"
fi

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
echo "  ✓ systemd service created and enabled"

# ─── 13. Cloudflared tunnel setup ──────────────────────────────────
echo ""
echo "▶ Setting up cloudflared tunnel..."

if [ ! -d /root/.cloudflared ] || [ ! -f /root/.cloudflared/cert.pem ]; then
    echo ""
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║  CLOUDFLARED AUTH REQUIRED                              ║"
    echo "  ║                                                         ║"
    echo "  ║  Run these commands to authenticate:                    ║"
    echo "  ║    cloudflared tunnel login                              ║"
    echo "  ║    (opens browser — authorize for jordanchristley.com)  ║"
    echo "  ║                                                         ║"
    echo "  ║  Then create the tunnel:                                ║"
    echo "  ║    cloudflared tunnel create rapclouds                   ║"
    echo "  ║    cloudflared tunnel route dns rapclouds rapclouds.jordanchristley.com ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo ""
else
    echo "  ✓ Cloudflared auth found"

    if cloudflared tunnel list 2>/dev/null | grep -q rapclouds; then
        echo "  ✓ Tunnel 'rapclouds' exists"
        TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep rapclouds | awk '{print $1}')
        CREDS_FILE=$(ls /root/.cloudflared/*.json 2>/dev/null | head -1)

        cat > /root/.cloudflared/config.yml << TUNNELEOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS_FILE}

ingress:
  - hostname: rapclouds.jordanchristley.com
    service: http://localhost:${PORT}
  - service: http_status:404
TUNNELEOF
        echo "  ✓ Tunnel config written"

        cat > /etc/systemd/system/cloudflared-rapclouds.service << CFEOF
[Unit]
Description=Cloudflared Tunnel for RapClouds
After=network.target ${SERVICE_NAME}.service
Requires=${SERVICE_NAME}.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --config /root/.cloudflared/config.yml run rapclouds
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
CFEOF

        systemctl daemon-reload
        systemctl enable cloudflared-rapclouds
        echo "  ✓ cloudflared systemd service created"
    else
        echo "  ⚠ Tunnel 'rapclouds' not found. Run:"
        echo "    cloudflared tunnel create rapclouds"
        echo "    cloudflared tunnel route dns rapclouds rapclouds.jordanchristley.com"
    fi
fi

# ─── 14. Firewall (GCP default: ufw) ──────────────────────────────
echo ""
echo "▶ Checking firewall..."
if command -v ufw &>/dev/null; then
    ufw allow ${PORT}/tcp 2>/dev/null || true
    echo "  ✓ Firewall port ${PORT} opened (ufw)"
else
    echo "  ℹ No ufw found — ensure port ${PORT} is open in GCP firewall rules"
    echo "    (Cloudflare tunnel recommended — direct port access optional)"
fi

# ─── 15. Start services ────────────────────────────────────────────
echo ""
echo "▶ Starting services..."
systemctl start ${SERVICE_NAME}
sleep 2

if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "  ✓ RapClouds server running on port ${PORT}"
else
    echo "  ❌ RapClouds server failed to start. Check: journalctl -u ${SERVICE_NAME} -f"
fi

if systemctl list-unit-files | grep -q cloudflared-rapclouds; then
    systemctl start cloudflared-rapclouds
    sleep 3
    if systemctl is-active --quiet cloudflared-rapclouds; then
        echo "  ✓ Cloudflared tunnel running"
    else
        echo "  ❌ Cloudflared failed. Check: journalctl -u cloudflared-rapclouds -f"
    fi
fi

# ─── 16. Verify ────────────────────────────────────────────────────
echo ""
echo "▶ Verifying deployment..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "  ✓ Server responding on localhost:${PORT} (HTTP ${HTTP_CODE})"
else
    echo "  ⚠ Server returned HTTP ${HTTP_CODE} — may still be starting up"
fi

# ─── Done ──────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ RapClouds GCP Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  App directory:  ${APP_DIR}"
echo "  Server:         http://localhost:${PORT}"
echo "  Public URL:     https://rapclouds.jordanchristley.com (after DNS)"
echo ""
echo "  Useful commands:"
echo "    systemctl status ${SERVICE_NAME}        # Check server status"
echo "    systemctl restart ${SERVICE_NAME}       # Restart server"
echo "    journalctl -u ${SERVICE_NAME} -f        # Tail server logs"
echo "    systemctl status cloudflared-rapclouds  # Check tunnel status"
echo ""
echo "  Secrets management:"
echo "    doppler setup                           # Configure Doppler project"
echo "    doppler secrets set OPENAI_API_KEY=...  # Set API key via Doppler"
echo ""
echo "  DNS setup:"
echo "    Point rapclouds.jordanchristley.com → GCP VM external IP"
echo "    Or use Cloudflare DNS with the tunnel (recommended)"
echo "═══════════════════════════════════════════════════════════════"
