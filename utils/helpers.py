import os
import datetime

def save_uploaded_file(uploaded_file, directory="uploads"):
    """Save a streamlit uploaded file to a local directory"""
    if not os.path.exists(directory):
        os.makedirs(directory)
        
    file_path = os.path.join(directory, uploaded_file.name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return file_path

def get_current_timestamp():
    """Get formatted timestamp for logging"""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
