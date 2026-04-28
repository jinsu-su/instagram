from google.cloud import storage

def list_buckets():
    try:
        client = storage.Client.from_service_account_json("./gcp-key.json")
        buckets = list(client.list_buckets())
        print("Available buckets:")
        for bucket in buckets:
            print(f"- {bucket.name}")
    except Exception as e:
        print(f"Error listing buckets: {e}")

if __name__ == "__main__":
    list_buckets()
