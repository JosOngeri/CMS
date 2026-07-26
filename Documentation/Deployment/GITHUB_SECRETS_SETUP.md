# GitHub Secrets Setup for VPS Deployment

## Overview
This document provides instructions for setting up the required GitHub secrets for automated VPS deployment of KMainCMS to cms.josongeri.co.ke.

## Required GitHub Secrets

### 1. VPS_HOST
- **Description**: The IP address or hostname of your VPS server
- **Example**: `cms.josongeri.co.ke` or `192.168.1.100`
- **How to get**: Your VPS provider provides this information

### 2. VPS_USER
- **Description**: The SSH username for connecting to your VPS
- **Example**: `root`, `ubuntu`, or your custom user
- **How to get**: Created when setting up your VPS

### 3. SSH_PRIVATE_KEY
- **Description**: The private SSH key for authentication
- **Format**: The complete private key content (including BEGIN/END markers)
- **How to generate**: 
  ```bash
  ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions
  ```

## Setup Instructions

### Step 1: Generate SSH Key Pair

On your local machine:

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps-ip
```

Or manually:

```bash
# Copy public key content
cat ~/.ssh/github_actions.pub
```

Then on VPS:

```bash
# Add to authorized_keys
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

#### VPS_HOST
- **Name**: `VPS_HOST`
- **Value**: `cms.josongeri.co.ke` (or your VPS IP)
- **Description**: VPS hostname or IP address

#### VPS_USER
- **Name**: `VPS_USER`
- **Value**: `root` (or your VPS username)
- **Description**: SSH username for VPS access

#### SSH_PRIVATE_KEY
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: Paste the entire private key content:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```
- **Description**: Private SSH key for GitHub Actions

### Step 3: Configure VPS for SSH Access

On your VPS:

```bash
# Ensure SSH is running
sudo systemctl status ssh

# Ensure git is installed
sudo apt install git

# Ensure Node.js and npm are installed
node --version
npm --version

# Ensure PM2 is installed
pm2 --version

# Create project directory if it doesn't exist
sudo mkdir -p /var/www/kmaincms
sudo chown -R $USER:$USER /var/www/kmaincms
```

### Step 4: Clone Repository on VPS (First Time Only)

```bash
cd /var/www/kmaincms
git clone https://github.com/your-username/KMainCMS.git .
```

### Step 5: Initial Setup on VPS (First Time Only)

```bash
cd /var/www/kmaincms

# Install dependencies
cd backend
npm install --production

cd ../frontend
npm install --production
npm run build

# Configure environment variables
cd ../backend
cp .env.example .env
nano .env
# Add your production environment variables

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Testing the Workflow

### Manual Trigger

1. Go to GitHub repository
2. Navigate to **Actions** tab
3. Select **Deploy to Production VPS** workflow
4. Click **Run workflow**
5. Optionally add input parameters

### Automatic Trigger

The workflow will automatically run when you push to the `main` branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

## Security Best Practices

1. **Use SSH Keys**: Never use password authentication in workflows
2. **Limit SSH Access**: Restrict SSH access to specific IPs if possible
3. **Rotate Keys**: Rotate SSH keys periodically
4. **Monitor Logs**: Regularly check GitHub Actions logs for suspicious activity
5. **Use Branch Protection**: Protect main branch and require PR reviews

## Troubleshooting

### SSH Connection Failed

- Verify VPS_HOST and VPS_USER secrets are correct
- Check that SSH_PRIVATE_KEY is properly formatted
- Ensure VPS firewall allows SSH connections
- Test SSH connection manually: `ssh -i ~/.ssh/github_actions user@vps-host`

### Deployment Failed

- Check GitHub Actions logs for specific error messages
- Verify all dependencies are installed on VPS
- Ensure PM2 is properly configured
- Check that environment variables are set correctly

### Health Check Failed

- Verify the application is running: `pm2 status`
- Check application logs: `pm2 logs kmaincms`
- Test health endpoint manually: `curl https://cms.josongeri.co.ke/api/health`
- Ensure Nginx is properly configured

## Additional Secrets (Optional)

For full functionality, you may also want to add:

### Database Secrets
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### External API Keys
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `JOSMS_API_KEY`
- `BLESSED_TEXTS_API_KEY`

These should be configured in the backend `.env` file on the VPS.

## Workflow Features

The updated deployment workflow includes:

- ✅ **Git-based deployment**: Pulls latest changes from GitHub
- ✅ **Dependency installation**: Installs backend and frontend dependencies
- ✅ **Frontend building**: Builds production frontend bundle
- ✅ **PM2 restart**: Gracefully restarts the application
- ✅ **Health checks**: Verifies backend and mobile API endpoints
- ✅ **Mobile API verification**: Tests mobile-specific endpoints
- ✅ **Status reporting**: Provides deployment status and logs
- ✅ **Error notifications**: Alerts on deployment failures

## Maintenance

### Regular Tasks

1. **Update dependencies**: Regularly run `npm update` and test
2. **Monitor logs**: Check PM2 logs for errors
3. **Backup database**: Regular database backups
4. **SSL renewal**: Ensure SSL certificates are renewed
5. **Security updates**: Keep server packages updated

### Rollback Procedure

If deployment fails:

```bash
# On VPS
cd /var/www/kmaincms
git log
git checkout previous-commit-hash
pm2 restart kmaincms
```

## Support

For issues with deployment:
1. Check GitHub Actions logs
2. Check VPS application logs
3. Review this documentation
4. Contact VPS provider if needed
