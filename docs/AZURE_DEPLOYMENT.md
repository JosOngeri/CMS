# Azure Deployment Guide for KMainCMS

This guide provides step-by-step instructions to deploy KMainCMS to Azure using the Azure CLI.

## Prerequisites

1.  **Azure CLI**: Installed and available.
2.  **Azure Account**: An active subscription.
3.  **Local Project**: The project is ready (frontend builds, backend serves it).

## Step 1: Login to Azure

Run the following command and follow the browser instructions:

```bash
az login
```

## Step 2: Set Variables

Replace the values below with your preferred names:

```bash
RESOURCE_GROUP="KMainCMS_RG"
LOCATION="eastus" # or your preferred region
APP_SERVICE_PLAN="KMainCMS_Plan"
APP_NAME="kmaincms-app" # Must be globally unique
DB_SERVER_NAME="kmaincms-db-server" # Must be globally unique
DB_NAME="kmaincms"
DB_USER="kmainadmin"
DB_PASSWORD="YourSecurePassword123!"
```

## Step 3: Create Resource Group

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

## Step 4: Create Azure Database for PostgreSQL (Flexible Server)

```bash
az postgres flexible-server create \
    --resource-group $RESOURCE_GROUP \
    --name $DB_SERVER_NAME \
    --location $LOCATION \
    --admin-user $DB_USER \
    --admin-password $DB_PASSWORD \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --public-access 0.0.0.0 \
    --database-name $DB_NAME \
    --yes
```

*Note: In production, you should restrict `--public-access` to specific IPs or use Virtual Network integration.*

## Step 5: Create App Service Plan (Linux)

```bash
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --is-linux \
    --sku B1
```

## Step 6: Create Web App (Node.js)

```bash
az webapp create \
    --name $APP_NAME \
    --plan $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --runtime "NODE:18-lts"
```

## Step 7: Configure Environment Variables

```bash
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings \
    NODE_ENV=production \
    PORT=8080 \
    DB_HOST="$DB_SERVER_NAME.postgres.database.azure.com" \
    DB_PORT=5432 \
    DB_NAME=$DB_NAME \
    DB_USER=$DB_USER \
    DB_PASSWORD=$DB_PASSWORD \
    JWT_SECRET="YOUR_LONG_RANDOM_SECRET" \
    REFRESH_TOKEN_SECRET="YOUR_OTHER_RANDOM_SECRET" \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## Step 8: Deploy Code

Azure App Service supports several deployment methods. The easiest for a quick setup is via ZIP:

1.  **Build locally (optional, Azure can also build if configured)**:
    ```bash
    npm install
    npm run build
    ```

2.  **Zip and Deploy**:
    ```bash
    # Exclude node_modules and .git to keep it small
    # On Windows (PowerShell):
    Compress-Archive -Path * -DestinationPath deploy.zip -Exclude ".git", "node_modules", "deploy.zip"
    az webapp deployment source config-zip --resource-group $RESOURCE_GROUP --name $APP_NAME --src deploy.zip
    ```

## Step 9: Run Database Migrations

Once the app is running, you need to run the migrations. You can do this by using SSH in the Azure Portal or by running a migration script from your local machine pointing to the Azure DB.

Alternatively, add a script to run migrations on startup in `backend/server.js` or via a custom deployment script.

## Monitoring

View logs in real-time:
```bash
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```
