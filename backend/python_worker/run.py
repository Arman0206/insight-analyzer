import sys
import json
import warnings
import os
from dotenv import load_dotenv

# Suppress warnings to maintain clean stdout for Node.js
warnings.filterwarnings("ignore")

# Load environment variables from the parent backend folder
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

from data_extract import do1
from processor import analyze1

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No link provided"}))
        sys.exit(1)

    link = sys.argv[1]
    
    try:
        df, product_description = do1(link)
        
        if df.empty:
            print(json.dumps({"error": "No reviews found for this product."}))
            sys.exit(0)
            
        result = analyze1(df, product_description)
        
        print(json.dumps({"result": result}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()