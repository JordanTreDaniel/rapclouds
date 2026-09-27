# RapClouds — GCP Deployment Guide

## Prerequisites

- GCP account with billing enabled (e2-micro is Free Tier eligible)
- `gcloud` CLI authenticated (`gcloud auth login`)
- Cloudflare account with `jordanchristley.com` zone
- OpenAI API key (or Doppler for secrets management)

## Quick Start (one command)

```bash
# 1. SSH into your GCP VM
gcloud compute ssh rapclouds-vm --zone=us-central1-a

# 2. Copy the rapclouds directory to the VM
gcloud compute scp --recurse ~/workspace/rapclouds rapclouds-vm:/tmp/ --zone=us-central1-a

# 3. Run the deployment script
gcloud compute ssh rapclouds-vm --zone=us-central1-a
sudo bash /tmp/rapclouds/deploy-gcp.sh
```

## Step-by-Step Setup

### 1. Create GCP VM

```bash
# Create an e2-micro instance (Free Tier: 1 vCPU, 1GB RAM)
gcloud compute instances create rapclouds-vm \
    --zone=us-central1-a \
    --machine-type=e2-micro \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=10GB \
    --tags=rapclouds
```

Or via GCP Console:
1. Go to console.cloud.google.com → Compute Engine → VM instances → Create
2. Name: `rapclouds-vm`
3. Machine type: **e2-micro** (1 vCPU, 1GB RAM — Free Tier)
4. Boot disk: **Ubuntu 22.04 LTS**, 10GB
5. Firewall: Allow HTTP traffic (or use Cloudflare tunnel)

### 2. Configure Firewall (if not using Cloudflare tunnel)

```bash
# Allow HTTP on port 8000
gcloud compute firewall-rules create rapclouds-http \
    --allow=tcp:8000 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=rapclouds
```

### 3. Upload & Deploy

```bash
# From your local machine
gcloud compute scp --recurse ~/workspace/rapclouds rapclouds-vm:/tmp/ --zone=us-central1-a

# On the VM
gcloud compute ssh rapclouds-vm --zone=us-central1-a
sudo bash /tmp/rapclouds/deploy-gcp.sh
```

### 4. Set OpenAI API Key

```bash
# Option A: Direct env file
sudo nano /etc/rapclouds.env
# Set: OPENAI_API_KEY=your-key-here
sudo systemctl restart rapclouds

# Option B: Doppler (recommended for production)
doppler setup
doppler secrets set OPENAI_API_KEY=your-key-here
sudo systemctl restart rapclouds
```

### 5. Cloudflare Tunnel (for HTTPS + domain)

```bash
# Authenticate with Cloudflare
sudo cloudflared tunnel login

# Create the tunnel
sudo cloudflared tunnel create rapclouds

# Route DNS
sudo cloudflared tunnel route dns rapclouds rapclouds.jordanchristley.com

# The deploy script auto-configures the tunnel if auth exists.
# If you ran the script first, re-run it or manually create the config:
sudo cloudflared tunnel run rapclouds
```

### 6. DNS (if not using Cloudflare tunnel)

Point `rapclouds.jordanchristley.com` to your GCP VM external IP:
- A record: `rapclouds` → `<VM_EXTERNAL_IP>`

Get your external IP:
```bash
gcloud compute instances describe rapclouds-vm --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

## Architecture

```
Internet
  ↓
Cloudflare (HTTPS)
  ↓
cloudflared tunnel (port 443 → localhost:8000)
  ↓
RapClouds FastAPI (port 8000)
  ├── /api/*        → API endpoints (word cloud, karaoke)
  ├── /songs/*      → Static song audio files
  ├── /*            → React SPA (built Vite frontend)
  └── /admin        → Admin dashboard
```

## Directory Structure on VM

```
/opt/rapclouds/
├── rapclouds-ui/          # React frontend + FastAPI server
│   ├── server/
│   │   ├── main.py        # FastAPI app
│   │   └── run_server.py  # Production launcher
│   ├── dist/              # Built frontend
│   ├── src/               # React source
│   └── package.json
├── standalone/            # Word cloud generation code
│   ├── generate_layers_v7.py
│   ├── masks/             # (symlinked to data/masks)
│   ├── lyrics/            # (symlinked to data/lyrics)
│   └── fonts/
├── data/
│   ├── songs/             # Karaoke song audio files
│   ├── masks/             # Word cloud mask images
│   ├── lyrics/            # Song lyrics text files
│   └── fonts/             # Custom fonts
├── venv/                  # Python virtual environment
└── requirements.txt
```

## Service Management

```bash
# Server
sudo systemctl status rapclouds
sudo systemctl restart rapclouds
sudo journalctl -u rapclouds -f

# Tunnel
sudo systemctl status cloudflared-rapclouds
sudo systemctl restart cloudflared-rapclouds
sudo journalctl -u cloudflared-rapclouds -f

# Logs
sudo journalctl -u rapclouds --since "1 hour ago"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `OPENAI_API_KEY` | (none) | OpenAI API key for Whisper |
| `KARAOKE_SONGS_DIR` | `/opt/rapclouds/data/songs` | Song audio files |
| `RAPCLOUDS_MASKS_DIR` | `/opt/rapclouds/data/masks` | Word cloud masks |
| `RAPCLOUDS_LYRICS_DIR` | `/opt/rapclouds/data/lyrics` | Song lyrics |
| `RAPCLOUDS_FONTS_DIR` | `/opt/rapclouds/data/fonts` | Custom fonts |

## Updating

```bash
# Re-upload the repo
gcloud compute scp --recurse ~/workspace/rapclouds rapclouds-vm:/tmp/ --zone=us-central1-a

# Re-run deploy (safe to re-run — preserves data and config)
sudo bash /tmp/rapclouds/deploy-gcp.sh
sudo systemctl restart rapclouds
```

## Troubleshooting

**Server won't start:**
```bash
sudo journalctl -u rapclouds -n 50
# Common: missing OPENAI_API_KEY (set in /etc/rapclouds.env or Doppler)
```

**Word cloud generation fails:**
```bash
# Check masks and lyrics are in place
ls -la /opt/rapclouds/data/masks/
ls -la /opt/rapclouds/data/lyrics/
```

**Tunnel not connecting:**
```bash
sudo cloudflared tunnel run rapclouds
# Check DNS: dig rapclouds.jordanchristley.com
```

**Port 8000 not reachable:**
- Check GCP firewall rules allow inbound 8000
- Check: `curl -v http://localhost:8000/`

**Memory issues (e2-micro has 1GB):**
```bash
# Check memory usage
free -h
# The systemd service has MemoryMax=800M set
# If running out of memory, consider upgrading to e2-small (2GB)
```

## Cost

- **e2-micro**: Free Tier (1 vCPU, 1GB RAM, 30GB disk)
- **Network**: Free Tier includes 1GB egress/month
- **Cloudflare Tunnel**: Free (included in free plan)
- **Total**: $0/month within Free Tier limits

## Upgrading from e2-micro

If you need more resources (e.g., for concurrent word cloud generation):

```bash
gcloud compute instances set-machine-type rapclouds-vm \
    --zone=us-central1-a \
    --machine-type=e2-small  # 2 vCPU, 2GB RAM (~$5/month)
```
