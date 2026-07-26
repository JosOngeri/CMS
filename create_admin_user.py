import paramiko
import sys
import io
import json

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

# Check roles and existing users
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c 'SELECT id, name FROM roles'", "Check roles")
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c 'SELECT * FROM users'", "Check existing users")

# Create password hash using Node.js bcrypt (matches backend)
run("node -e \"const bcrypt = require('bcryptjs'); bcrypt.hash('Right123', 12).then(h => console.log(h))\"", "Hash password")

client.close()
print("\nDone.")
