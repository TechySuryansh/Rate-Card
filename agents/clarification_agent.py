import os
import json
from datetime import datetime
from openai import OpenAI

def clarification_agent(rejected_lanes: list, reason: str = "Price discrepancy"):
    """
    Stage 7 Agent: Manages communications for rejected lanes.
    
    Args:
        rejected_lanes (list): List of lanes requiring clarification.
        reason (str): The reason for rejection.
        
    Returns:
        dict: Clarification logs and simulated carrier response.
    """
    print(f"📧 Clarification Agent starting for {len(rejected_lanes)} lanes...")
    
    try:
        # 1. Generate Clarification Message using AI
        message = generate_carrier_email(rejected_lanes, reason)
        
        # 2. Simulate Carrier Response (in a real app, this would wait for an email/webhook)
        simulated_response = {
            "status": "resolved",
            "message": "We have reviewed the Shanghai lane. The 16% increase was a typo, it should be 6%. Corrected rate: $2226.",
            "corrected_rate": 2226,
            "lane": "Shanghai -> LA"
        }
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "outbound_message": message,
            "inbound_response": simulated_response,
            "status": "awaiting_reprocessing"
        }
        
        # Save to logs
        log_dir = "data/clarifications"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        log_path = os.path.join(log_dir, f"clarification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(log_path, 'w') as f:
            json.dump(log_entry, f, indent=2)
            
        return {
            "status": "success",
            "log_path": log_path,
            "clarification_summary": log_entry
        }
        
    except Exception as e:
        print(f"❌ Clarification Error: {str(e)}")
        return {"status": "error", "error": str(e)}

def generate_carrier_email(lanes, reason):
    """Uses OpenAI to draft a professional clarification email."""
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "placeholder"))
        
        lane_desc = ", ".join([f"{l.get('origin', 'N/A')} to {l.get('destination', 'N/A')}" for l in lanes[:3]])
        
        prompt = f"""
        Draft a professional, polite email to a logistics carrier regarding a rate discrepancy.
        Lanes: {lane_desc}
        Issue: {reason}
        Request: Please clarify if these rates are final or if there's a filing error.
        """
        
        if not os.getenv("OPENAI_API_KEY") or "your_openai_api_key" in os.getenv("OPENAI_API_KEY"):
             return f"Dear Carrier, We noticed a {reason} on the following lanes: {lane_desc}. Could you please verify these figures?"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except:
        return "Manual clarification required. AI drafting unavailable."

if __name__ == "__main__":
    print("📧 Clarification Agent Ready.")
