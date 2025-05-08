# utils/config_loader.py

import json
import os

def load_config():
    with open(os.path.join('config', 'config.json')) as config_file:
        config = json.load(config_file)
    return config

def get_provider(service_name):
    config = load_config()
    return config.get(service_name, config.get("default_provider"))
