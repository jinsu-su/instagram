import google.generativeai as genai
from typing_extensions import TypedDict
import typing
import asyncio

class BestPost(TypedDict, total=False):
    caption: str
    reason: str

class PerformanceAnalysis(TypedDict):
    summary: str
    analysis: str
    best_post: typing.Optional[BestPost]
    strategy: typing.List[str]

async def test():
    try:
        genai.configure(api_key="faketestkey")
        model = genai.GenerativeModel("gemini-1.5-flash")
        generation_config = {
            "response_mime_type": "application/json",
            "response_schema": PerformanceAnalysis,
        }
        # We just want to see if setting the config throws when generating the API request. 
        # But wait, it might only throw when actually making the HTTP request, which requires a real key.
        print("Schema loaded fine!")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(test())
