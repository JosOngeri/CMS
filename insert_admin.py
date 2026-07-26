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

# Insert admin user and assign Super Admin role
sql = """
WITH new_user AS (
  INSERT INTO users (id, username, email, password_hash, first_name, last_name, phone_number, is_active, church_id, church_slug, slug)
  SELECT 
    uuid_generate_v4(),
    'Admin',
    'admin@kiserian-sda.co.ke',
    '$2b$12$.n2tVl5R47MTWmDuGeC6pes3PGKHdVNtwdd4tDYvGhFGT.e/r04zC',
    'Admin',
    'User',
    '+254700000000',
    true,
    id,
    slug,
    'admin'
  FROM churches WHERE slug = 'kiserian-main-sda'
  ON CONFLICT (username) DO NOTHING
  RETURNING id
)
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, CURRENT_TIMESTAMP
FROM new_user u
CROSS JOIN roles r
WHERE r.name = 'Super Admin';
"""

run(f"PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c \"{sql}\"", "Create Admin user and assign Super Admin role")

# Verify
run("PGPASSWORD='Jos@123' psql -h localhost -U postgres -d cms_db -c \"SELECT u.id, u.username, u.email, u.is_active, array_agg(r.name) as roles FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id WHERE u.username = 'Admin' GROUP BY u.id, u.username, u.email, u.is_active\"", "Verify Admin user")

client.close()
print("\nDone.")
