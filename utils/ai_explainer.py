import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class AIExplainer:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.is_mock = not os.getenv("GROQ_API_KEY") or "gsk_" not in os.getenv("GROQ_API_KEY")

    def explain_validation(self, issue_count, corrections):
        """Explains validation issues in plain English."""
        if self.is_mock:
            return f"The AI found {issue_count} data inconsistencies. We auto-corrected {len(corrections)} spelling errors to ensure your database stays clean."
        
        prompt = f"Explain to a manager why finding {issue_count} issues and applying {len(corrections)} corrections like {corrections} is important for data integrity."
        return self._call_ai(prompt)

    def explain_impact(self, total_delta, risk_level):
        """Explains the business impact of the rate changes."""
        if self.is_mock:
            return f"Financial risk is {risk_level}. The projected cost change is ${total_delta}. This represents a strategic shift in carrier pricing for your primary routes."
        
        prompt = f"Provide a brief business impact analysis for a rate card change of ${total_delta} with a {risk_level} risk level. Focus on budget implications."
        return self._call_ai(prompt)

    def get_approval_recommendation(self, summary_data):
        """Provides a final approval recommendation."""
        if self.is_mock:
            return "RECOMMENDATION: Approve with Caution. While the data is clean, the 5% average increase in APAC should be audited next quarter."
        
        prompt = f"Based on this rate card summary: {summary_data}, give a 1-sentence approval recommendation for a procurement director."
        return self._call_ai(prompt)

    def _call_ai(self, prompt):
        try:
            response = self.client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "system", "content": "You are a professional logistics and procurement analyst."},
                          {"role": "user", "content": prompt}],
                max_tokens=200
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq Error: {str(e)}")
            return "AI Insights currently unavailable. Please check API configuration."

# Singleton instance
explainer = AIExplainer()
