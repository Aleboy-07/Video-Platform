import boto3
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
REGION = os.getenv("AWS_REGION")

def upload_file(file, folder: str) -> str:
    extension = file.filename.split(".")[-1]
    key = f"{folder}/{uuid.uuid4()}.{extension}"
    s3_client.upload_fileobj(
        file.file,
        BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": file.content_type}
    )
    url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{key}"
    return url
