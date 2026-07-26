import subprocess
import sys

# Check local database users
cmd = f'psql -h localhost -U postgres -d kmaincms -c "SELECT id, username, email FROM users"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env={'PGPASSWORD': 'Jos@123'})
print("Local database users:")
print(result.stdout)
print(result.stderr)
