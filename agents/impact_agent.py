import pandas as pd
import os
import json
from datetime import datetime
from openai import OpenAI

def impact_agent(comparison_csv_path: str):
    """
    Stage 4 Agent: Analyzes financial impact and generates business summaries.
    
    Args:
        comparison_csv_path (str): Path to the comparison data from Stage 3.
        
    Returns:
        dict: Financial impact report including executive summary.
    """
    print(f"💰 Impact Analysis Agent starting...")
    
    # Ensure output directory exists
    output_dir = "data/impact"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    try:
        # Load comparison data
        df = pd.read_csv(comparison_csv_path)
        
        # 1. Quantitative Analysis
        total_increase = df['rate_diff'].sum()
        high_risk_lanes = df[df['percent_change'] > 10].to_dict(orient='records')
        
        # Carrier-wise Summary
        # Note: We use carrier_old if available, otherwise carrier_new
        carrier_col = 'carrier_old' if 'carrier_old' in df.columns else 'carrier'
        carrier_summary = df.groupby(carrier_col).agg({
            'percent_change': 'mean',
            'rate_diff': 'sum'
        }).reset_index().to_dict(orient='records')
        
        # 2. OpenAI-Powered Executive Summary
        executive_summary = generate_ai_summary(total_increase, len(high_risk_lanes), carrier_summary)
        
        # 3. Final Report Structure
        report = {
            "financial_metrics": {
                "total_projected_delta": float(total_increase),
                "avg_percentage_change": float(df['percent_change'].mean()),
                "high_risk_lane_count": len(high_risk_lanes)
            },
            "risk_analysis": {
                "high_risk_lanes": high_risk_lanes[:5], # Top 5 for the report
                "impact_level": "High" if total_increase > 10000 or len(high_risk_lanes) > 5 else "Low"
            },
            "carrier_impact": carrier_summary,
            "executive_summary": executive_summary,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save report as JSON
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(output_dir, f"impact_report_{timestamp}.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        return {
            "status": "success",
            "report_path": report_path,
            "summary": report
        }
        
    except Exception as e:
        print(f"❌ Impact Analysis Error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

def generate_ai_summary(total_delta, high_risk_count, carrier_stats):
    """Uses OpenAI to generate a professional business summary."""
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "placeholder"))
        
        prompt = f"""
        Analyze the following logistics rate card impact data and provide a 3-sentence executive summary:
        - Total Cost Change: ${total_delta}
        - High-Risk Lanes (>10% increase): {high_risk_count}
        - Carrier Performance: {json.dumps(carrier_stats)}
        
        Focus on the financial risk and recommendation for the procurement team.
        """
        
        # Placeholder for actual API call to save user credits/prevent errors if no key
        if os.getenv("OPENAI_API_KEY") == "your_openai_api_key_here" or not os.getenv("OPENAI_API_KEY"):
            return f"Projected cost change is ${total_delta}. There are {high_risk_count} high-risk lanes requiring immediate review. Recommendations: Re-negotiate top increases and audit carrier performance."

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except:
        return "AI Summary unavailable. Please check OpenAI API configuration."

if __name__ == "__main__":
    print("💰 Impact Analysis Agent Ready.")
