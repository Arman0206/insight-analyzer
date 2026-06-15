import re
import math
import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.stem import WordNetLemmatizer
from nltk.corpus import words
from collections import defaultdict
from difflib import get_close_matches

# Global Initialization
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('vader_lexicon', quiet=True)
nltk.download('words', quiet=True)

sia = SentimentIntensityAnalyzer()
lem = WordNetLemmatizer()
english_words = set(words.words())

generic_words = {
    "good","great","nice","amazing","wonderful","excellent","fantastic","awesome",
    "brilliant","incredible","superb","outstanding","impressive","fabulous","perfect",
    "decent","pleasant","lovely","positive","splendid","terrific","cool",
    "bad","terrible","awful","poor","horrible","worst","disappointing","mediocre",
    "unpleasant","cheap","weak","flimsy","slow","boring","annoying","useless"
}

def analyze1(df, product_description):    
    def clean_text(s):
        if s is None: return ""
        s = str(s).lower()
        s = re.sub(r'[^a-z\s]', ' ', s)
        return re.sub(r'\s+', ' ', s).strip()

    def compute_intensity(row):
        text = row.get('review')
        rating = row.get('rating', 2.5)
        rating_dev = abs(rating - 2.5) 
        if not text:
            return (1 if rating > 2.5 else -1 if rating < 2.5 else 0) * rating_dev
        return sia.polarity_scores(clean_text(text))['compound'] * rating_dev 

    df['intensity'] = df.apply(compute_intensity, axis=1)

    def keep_nouns_verbs(text):
        tokens = [t for t in nltk.word_tokenize(clean_text(text)) if t not in generic_words]
        tagged = nltk.pos_tag(tokens)
        return " ".join([lem.lemmatize(w, 'n' if tag.startswith('NN') else 'v') 
                         for w, tag in tagged if tag.startswith('NN') or tag.startswith('VB')])

    df['review'] = df['review'].apply(lambda t: keep_nouns_verbs(t if t else ""))

    def aggregate_features(df_subset):
        agg = defaultdict(float)
        for _, r in df_subset.iterrows():
            for t in nltk.word_tokenize(r['review']):
                if len(t) > 1: agg[t] += r['intensity'] 
        return agg

    pros_agg = aggregate_features(df[df['intensity'] > 0])
    cons_agg = aggregate_features(df[df['intensity'] < 0])

    def merge_similar_words(agg_dict, cutoff=0.85):
        merged = {}
        words_list = list(agg_dict.keys())
        for w in words_list:
            if any(w in group for group in merged.keys()): continue
            close = get_close_matches(w, words_list, n=5, cutoff=cutoff)
            merged[w] = sum(agg_dict[c] for c in close)
        return merged

    pros_agg = merge_similar_words(pros_agg)
    cons_agg = merge_similar_words(cons_agg)

    for word in list(set(pros_agg) & set(cons_agg)):
        if abs(pros_agg[word]) >= abs(cons_agg[word]): del cons_agg[word]
        else: del pros_agg[word]

    def filter_relevant_words(phrases, cutoff=0.5):
        desc_words = set(clean_text(product_description).split())
        return [(w, s) for w, s in phrases if get_close_matches(w, desc_words, n=1, cutoff=cutoff)]

    top_pros = filter_relevant_words(sorted([(w, s) for w, s in pros_agg.items()], key=lambda x: -abs(x[1]))[:5])
    top_cons = filter_relevant_words(sorted([(w, s) for w, s in cons_agg.items()], key=lambda x: -abs(x[1]))[:5])

    top_pros = [(w, s) for w, s in top_pros if w in english_words]
    top_cons = [(w, s) for w, s in top_cons if w in english_words]

    n_reviews = len(df)
    conf = (2 / math.pi) * math.atan(n_reviews / 25)
    pro_score = (sum(abs(i) for _, i in top_pros) / n_reviews if n_reviews else 0) * conf
    con_score = (sum(abs(i) for _, i in top_cons) / n_reviews if n_reviews else 0) * conf
    overall_score = pro_score - con_score

    def get_summary():
        p_lab = "Excellent" if pro_score > 0.4 else "Strong" if pro_score > 0.25 else "Moderate" if pro_score > 0.1 else "Few"
        c_lab = "Severe" if con_score > 0.4 else "Multiple" if con_score > 0.25 else "Mild" if con_score > 0.1 else "Few"
        o_lab = "Excellent" if overall_score >= 0.25 else "Good" if overall_score >= 0.10 else "Average" if overall_score >= 0.0 else "Poor"
        return f"Pro: {pro_score:.2f} ({p_lab}) | Con: {con_score:.2f} ({c_lab}) | Overall: {overall_score:.2f} ({o_lab})"

    return {
        "pros": list(top_pros),
        "cons": list(top_cons),
        "summary": get_summary()
    }