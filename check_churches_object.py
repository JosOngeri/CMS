import paramiko
import sys
import io

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

run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c \"SELECT c.relkind, c.relname, n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'churches'\"", "Check churches object type")
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c \"SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'churches'::regclass\"", "Check triggers on churches")
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c \"SELECT rulename, ev_type FROM pg_rules WHERE tablename = 'churches'\"", "Check rules on churches")

client.close()
print("\nDone.")
