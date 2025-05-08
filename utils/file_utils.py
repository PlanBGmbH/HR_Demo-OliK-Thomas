# utils/file_utils.py

import os
from utils.config_loader import load_config
from utils.secrets_loader import load_secrets
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta

# Initialize BlobServiceClient (make sure to replace with actual connection string)
config = load_config()
secrets = load_secrets()
azure_blob_connection_string = secrets["azure_blob_connection_string"]
azure_blob_account_name = secrets["azure_blob_account_name"]
azure_blob_key = secrets["azure_blob_key"]
azure_sas_url_expiry_hours = config["azure_sas_url_expiry_hours"]
blob_service_client = BlobServiceClient.from_connection_string(azure_blob_connection_string)
container_name = config["azure_image_container_name"]

def save_uploaded_files(files):
    """
    Saves uploaded files to the designated upload folder.
    :param files: List of uploaded file objects.
    :return: List of file paths where the files were saved.
    """
    config = load_config()
    file_paths = []
    upload_folder = config['upload_folder']
    if not upload_folder:
        print("Upload folder is not configured properly.")
    print(f"### FiLES  ####  {files}")
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    for file in files:
        filename = file.filename
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        file_paths.append(file_path)
    
    return file_paths

def upload_file_to_azure(file_path, blob_name):
    """
    Uploads a file to Azure Blob storage and returns the SAS URL for the file.
    
    :param file_path: Path to the file to be uploaded
    :param blob_name: The name for the blob in Azure storage
    :return: SAS URL for the uploaded file
    """
    # Upload the file to Azure Blob storage
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)

    with open(file_path, "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    
    # Generate and return SAS URL
    return generate_sas_url(blob_name)

def generate_sas_url(blob_name):
    """
    Generates a SAS URL for accessing the blob.
    
    :param blob_name: The name of the blob
    :return: SAS URL
    """
    # Load SAS expiration hours from config.json
    expiry_hours = config['azure_sas_url_expiry_hours']
    account_name=azure_blob_account_name

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=container_name,
        blob_name=blob_name,
        account_key=azure_blob_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.utcnow() + timedelta(hours=azure_sas_url_expiry_hours)  # 1-hour expiry
    )
    
    sas_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
    print(f"SAS URL = {sas_url}")
    return sas_url
