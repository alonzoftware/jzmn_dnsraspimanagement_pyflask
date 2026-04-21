# jzmn_dnsraspimanagement_pyflask


# REQUERIMIENTS
## Virtual Environment mode

mkdir ~/DNSRaspiManagement && cd ~/DNSRaspiManagement
python3 -m venv venv
source venv/bin/activate
. venv/bin/activate (deactivate to stop)

# Install Flask and Gunicorn in Virtual Environment Mode
flask
flask-cors          # If your dashboard frontend is on a different port/domain
dnspython           # DNS toolkit for queries and zone manipulation
psutil              # For CPU, RAM, and Network monitoring
gunicorn            # Recommended for running Flask in production on your Pi
ping3               # For network latency and pings

pip install flask gunicorn flask-cors dnspython psutil ping3
venv/bin/pip install psutil dnspython flask-cors ping3
