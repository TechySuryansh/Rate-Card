import pandas as pd
import os
from datetime import datetime, timedelta
import random

def generate_mock_rates():
    """Generates a mock dataset of active carrier rates for comparison."""
    
    # Ensure data directory exists
    if not os.path.exists("data"):
        os.makedirs("data")

    origins = ["Shanghai, CN", "Singapore, SG", "Rotterdam, NL", "Hamburg, DE", "Los Angeles, US", "Dubai, AE", "Antwerp, BE", "Ningbo, CN"]
    destinations = ["London, UK", "New York, US", "Tokyo, JP", "Sydney, AU", "Marseille, FR", "Santos, BR", "Mumbai, IN", "Jeddah, SA"]
    carriers = ["Global Freight Corp", "Oceanic Logistics", "SkyHigh Air", "Evergreen Marine", "Maersk Line", "DHL Global"]
    currencies = ["USD", "EUR", "GBP"]

    data = []
    
    for i in range(30):
        origin = random.choice(origins)
        dest = random.choice(destinations)
        # Ensure origin and destination are different
        while dest == origin:
            dest = random.choice(destinations)
            
        carrier = random.choice(carriers)
        rate = round(random.uniform(500, 5000), 2)
        currency = random.choice(currencies)
        
        # Effective date within the last 6 months
        days_ago = random.randint(1, 180)
        eff_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        data.append({
            "origin": origin,
            "destination": dest,
            "carrier": carrier,
            "current_rate": rate,
            "currency": currency,
            "effective_date": eff_date
        })

    df = pd.DataFrame(data)
    output_path = "data/active_rates.csv"
    df.to_csv(output_path, index=False)
    
    print(f"✅ Mock Active Rates generated: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_mock_rates()
