import logging
import os

def setup_logger(name: str):
    level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(level)
    ch = logging.StreamHandler()
    ch.setLevel(level)
    fmt = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    return logger
