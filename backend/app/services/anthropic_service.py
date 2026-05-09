import anthropic
import json
from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

async def generate_pitch_angles(
    business_name: str,
    business_category: str,
    business_description: str,
    freelancer_service: str,
    additional_context: str = ""
) -> dict:
    """
    Analyzes the business and generates a list of pitch angles
    tailored to the freelancer's service type.
    Returns: { angles: [...], suggested_pitch: "...", subject: "..." }
    """
    prompt = f"""
You are helping a freelancer pitch their services to a local business.

Business: {business_name}
Category: {business_category}
Description: {business_description}
Freelancer's service: {freelancer_service}
Additional context: {additional_context}

Analyze this business and generate:
1. 3-5 specific pitch angles (pain points or opportunities this business likely has that the freelancer can solve)
2. A concise, personalized pitch email (under 150 words, casual and direct, not corporate)
3. A compelling subject line

Respond ONLY in valid JSON, no markdown:
{{
  "angles": ["angle 1", "angle 2", "angle 3"],
  "suggested_pitch": "pitch text here",
  "subject": "email subject here"
}}
"""
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    return json.loads(text)

async def analyze_lead_post(post_content: str, freelancer_service: str) -> dict:
    """
    Analyzes a Reddit/Discord post to determine if it's a good lead
    and suggests a response angle.
    """
    prompt = f"""
A freelancer offering "{freelancer_service}" found this post online:

---
{post_content}
---

Determine:
1. Is this a good lead for this freelancer? (score 1-10)
2. What's the best angle to respond with?
3. Draft a short response (under 100 words, casual)

Respond ONLY in valid JSON:
{{
  "score": 7,
  "is_good_lead": true,
  "angle": "why this is a good fit",
  "suggested_response": "response text"
}}
"""
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    return json.loads(text)
