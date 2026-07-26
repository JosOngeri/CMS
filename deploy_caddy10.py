import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HOST = "173.249.17.180"
USER = "deploy"
PASSWORD = "Intellect"

LOCAL_CADDY = "D:/VIbeCode/KMainCMS/Caddyfile.fixed10"
REMOTE_TEMP = "/tmp/Caddyfile.fixed10"
REMOTE_REAL = "/etc/caddy/Caddyfile"

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

print("Uploading Caddyfile with @api matcher...")
sftp = client.open_sftp()
sftp.put(LOCAL_CADDY, REMOTE_TEMP)
sftp.close()

run(f"caddy validate --config {REMOTE_TEMP}", "Validate new Caddyfile")
run(f"cp {REMOTE_TEMP} {REMOTE_REAL}", "Copy to real Caddyfile")
run("caddy fmt --overwrite /etc/caddy/Caddyfile", "Format Caddyfile")
run("caddy reload --config /etc/caddy/Caddyfile", "Reload Caddy")

time.sleep(3)
run("curl -s -k https://cms.josongeri.co.ke/api/health", "Test Caddy /api/health")
run("curl -s -k https://cms.josongeri.co.ke/", "Test Caddy homepage")

client.close()
print("\nDone.")
