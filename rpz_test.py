import re
import datetime

def increment_serial(serial_str):
    today = datetime.datetime.now().strftime("%Y%m%d")
    if serial_str.startswith(today):
        idx = int(serial_str[8:]) + 1
        return f"{today}{idx:02d}"
    else:
        return f"{today}01"

print(increment_serial("2023051001"))
print(increment_serial(datetime.datetime.now().strftime("%Y%m%d") + "01"))
