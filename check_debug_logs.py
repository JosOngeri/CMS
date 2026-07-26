import paramiko
import sys
import io
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

run("pm2 flush kmaincms-backend", "Clear logs")
run("curl -s -k https://cms.josongeri.co.ke/api/health", "Make Caddy request")
time.sleep(2)
run("pm2 logs kmaincms-backend --lines 15 --nostream", "Check debug logs")

client.close()
print("\nDone.")
