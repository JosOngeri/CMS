:syntax region sqlString start=+'+ end=+'+
import paramiko
import sys
import io
import json
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HOST = "173.249.17.180"
USER = "deploy"
PASSWORD = "Intellect"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

def run(cmd, desc):
    print(f"\n>>> {desc}")
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print("STDOUT:", out)
    if err:
        print("STDERR:", err)
    return out, err

# Deploy latest migration
run("cd /var/www/CMS && git pull origin main", "Pull latest migration")
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -f /var/www/CMS/backend/migrations/010_fix_users_identity_columns.sql", "Run identity columns migration")
run("pm2 restart kmaincms-backend --update-env", "Restart backend")

time.sleep(5)

# Get CSRF token
stdin, stdout, stderr = client.exec_command("curl -s -k https://cms.josongeri.co.ke/api/csrf-token")
csrf_response = stdout.read().decode('utf-8', errors='replace')
print("CSRF Response:", csrf_response)

try:
    csrf_data = json.loads(csrf_response)
    csrf_token = csrf_data.get('csrfToken', '')
except:
    csrf_token = ''

# Test login with email
login_payload = json.dumps({
    "email": "admin@kiserian-sda.co.ke",
    "password": "Right123"
})

login_cmd = f"curl -s -k -X POST https://cms.josongeri.co.ke/api/auth/login -H 'Content-Type: application/json' -H 'X-CSRF-Token: {csrf_token}' -d '{login_payload}'"
run(login_cmd, "Test login with email")

client.close()
print("\nDone.")