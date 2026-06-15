import os
import requests
import pandas as pd

def do1(link: str):
    API_KEY = os.getenv("RAPIDAPI_KEY")
    
    def get_asin(url):
        parts = url.split("/")
        if "dp" in parts:
            return parts[parts.index("dp") + 1]
        elif "product" in parts:
            return parts[parts.index("product") + 1]
        return None

    ASIN = get_asin(link)
    COUNTRY = "IN"

    BASE_URL = "https://real-time-amazon-data.p.rapidapi.com"
    headers = {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com"
    }

    prod_url = f"{BASE_URL}/product-details"
    params = {"asin": ASIN, "country": COUNTRY}
    resp = requests.get(prod_url, headers=headers, params=params)

    if resp.status_code == 200:
        prod_data = resp.json().get("data", {})
        product_description = prod_data.get("product_description", "")
        
        if not product_description:
            about_list = prod_data.get("about_product", [])
            if isinstance(about_list, list):
                product_description  = " ".join(about_list)
    else:
        product_description = ""

    all_reviews = []
    for page in range(1, 6):
        review_url = f"{BASE_URL}/product-reviews"
        params = {"asin": ASIN, "country": COUNTRY, "page": str(page)}
        r = requests.get(review_url, headers=headers, params=params)
        if r.status_code != 200: continue
        
        data = r.json().get("data", {})
        reviews = data.get("reviews", data)
        if not isinstance(reviews, list) or len(reviews) == 0: break
        all_reviews.extend(reviews)

    if not all_reviews:
        df = pd.DataFrame(columns=["review", "rating"])
    else:
        df = pd.DataFrame(all_reviews)
        keep_cols = [c for c in ["review_title", "review_comment", "review_star_rating"] if c in df.columns]
        df = df[keep_cols]
        df["review"] = df["review_title"].fillna("") + " " + df["review_comment"].fillna("")
        df["rating"] = df["review_star_rating"].astype(float)
        df = df[["review", "rating"]]

    return df, product_description