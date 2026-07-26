import paramiko
import sys
import io
import json
import uuid

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

# Hash password using backend's bcryptjs from the backend directory
run("cd /var/www/CMS/backend && node -e \"const bcrypt = require('bcryptjs'); bcrypt.hash('Right123', 12).then(h => console.log(h))\"", "Hash password Right123")

client.close()
print("\nDone.")
