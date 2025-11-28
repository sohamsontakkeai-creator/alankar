"""
Timezone helper functions for IST (Indian Standard Time)
"""
from datetime import datetime
import pytz

# Define IST timezone
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """
    Get current datetime in IST
    Returns: datetime object in IST timezone
    """
    return datetime.now(IST)

def utc_to_ist(utc_dt):
    """
    Convert UTC datetime to IST
    Args:
        utc_dt: datetime object in UTC
    Returns: datetime object in IST
    """
    if utc_dt is None:
        return None
    if utc_dt.tzinfo is None:
        utc_dt = pytz.utc.localize(utc_dt)
    return utc_dt.astimezone(IST)

def ist_to_utc(ist_dt):
    """
    Convert IST datetime to UTC
    Args:
        ist_dt: datetime object in IST
    Returns: datetime object in UTC
    """
    if ist_dt is None:
        return None
    if ist_dt.tzinfo is None:
        ist_dt = IST.localize(ist_dt)
    return ist_dt.astimezone(pytz.utc)
