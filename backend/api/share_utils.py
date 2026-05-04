import random
import string


def generate_share_id():
    chars = string.ascii_lowercase + string.digits
    return 'route_' + ''.join(random.choices(chars, k=8))