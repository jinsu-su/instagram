import os
from google.cloud import storage

# Configuration
BUCKET_NAME = "aidm-assets-478801"
KEY_PATH = "./gcp-key.json"

def configure():
    try:
        client = storage.Client.from_service_account_json(KEY_PATH)
        bucket = client.bucket(BUCKET_NAME)

        # 1. Set CORS Policy
        # Allows client-side direct uploads (PUT) and authenticated requests
        bucket.cors = [
            {
                "origin": ["*"],  # Production: Replace with specific frontend domains
                "responseHeader": ["Content-Type", "Authorization"],
                "method": ["GET", "PUT", "POST", "OPTIONS"],
                "maxAgeSeconds": 3600
            }
        ]
        
        # 2. Set Lifecycle Rules 
        # Automatically delete objects after 30 days to save costs and clean up
        bucket.lifecycle_rules = [
            {
                "action": {"type": "Delete"},
                "condition": {"age": 30}
            }
        ]
        
        bucket.patch()
        print(f"✅ Successfully configured GCS bucket: {BUCKET_NAME}")
        print("   - CORS Policy: Applied")
        print("   - Lifecycle Rule (30 days): Applied")
        
    except Exception as e:
        print(f"❌ Failed to configure GCS: {str(e)}")

if __name__ == "__main__":
    configure()
