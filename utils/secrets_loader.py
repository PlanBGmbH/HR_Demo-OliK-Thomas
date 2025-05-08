# utils/secrets_loader.py

import json

def load_secrets():
    """
    Loads secrets from the secrets.json file.
    :return: Dictionary containing secrets.
    """
    with open('config/secrets.json') as secrets_file:
        return json.load(secrets_file)

def get_secret(service, key):
    """
    Retrieves a specific secret value.
    :param service: The service key in secrets.json (e.g., 'azure', 'google').
    :param key: The specific secret key (e.g., 'speech_key', 'region').
    :return: The secret value.
    """
    secrets = load_secrets()
    return secrets[service].get(key)
