import requests
from bs4 import BeautifulSoup
import json
import re

URL = "https://www.tickertape.in/mutualfunds/hdfc-flexi-cap-fund-M_HDCEQ"

def scrape_parag_parikh(url):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                             "AppleWebKit/537.36 (KHTML, like Gecko) "
                             "Chrome/100.0.4896.88 Safari/537.36"}
    
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    data = {}

    # --- NAV ---
    try:
        nav_label = soup.find('p', string=lambda s: s and "NAV" in s)
        if nav_label and nav_label.find_next_sibling():
            nav_span = nav_label.find_next_sibling().find('span')
            if nav_span:
                nav_text = nav_span.text.strip().replace('\u20b9','').replace('₹','').replace(',','')
                match = re.search(r"[\d\.]+", nav_text)
                data["NAV"] = match.group(0) if match else None
            else:
                data["NAV"] = None
        else:
            nav_span_fallback = soup.find('span', string=lambda s: s and re.search(r"\d+\.\d+", s) and 'Cr' not in s)
            if nav_span_fallback:
                nav_text = nav_span_fallback.text.strip().replace('\u20b9','').replace('₹','').replace(',','')
                match = re.search(r"[\d\.]+", nav_text)
                data["NAV"] = match.group(0) if match else None
            else:
                data["NAV"] = None
    except Exception:
        data["NAV"] = None

    # --- AUM ---
    try:
        aum_span = soup.find("span", string=lambda s: s and "Cr" in s and "," in s)
        data["AUM"] = aum_span.text.strip().replace('\u20b9','').replace('₹','') if aum_span else None
    except Exception:
        data["AUM"] = None

    # --- Expense Ratio ---
    # Cannot be scraped via requests; set to None
    # data["Expense Ratio"] = None

    # # --- PE Ratio ---
    # try:
    #     pe_label = soup.find(lambda tag: tag.name in ["p","div","span","td"] and "PE Ratio" in tag.get_text())
    #     if pe_label:
    #         pe_value_tag = pe_label.find_next(lambda tag: tag.name in ["span","div","td"] and re.match(r"^\d+(\.\d+)?$", tag.get_text().strip()))
    #         if pe_value_tag:
    #             data["PE Ratio"] = pe_value_tag.get_text().strip()
    #         else:
    #             match = re.search(r"\b\d+\.\d+\b", pe_label.get_text())
    #             data["PE Ratio"] = match.group(0) if match else None
    #     else:
    #         data["PE Ratio"] = None
    # except Exception:
    #     data["PE Ratio"] = None

    # # --- Sharpe Ratio ---
    # try:
    #     sharpe_label = soup.find(lambda tag: tag.name in ["p","div","span","td"] and "Sharpe Ratio" in tag.get_text())
    #     if sharpe_label:
    #         sharpe_value_tag = sharpe_label.find_next(lambda tag: tag.name in ["span","div","td"] and re.match(r"^-?\d+(\.\d+)?$", tag.get_text().strip()))
    #         if sharpe_value_tag:
    #             data["Sharpe Ratio"] = sharpe_value_tag.get_text().strip()
    #         else:
    #             match = re.search(r"-?\d+\.\d+", sharpe_label.get_text())
    #             data["Sharpe Ratio"] = match.group(0) if match else None
    #     else:
    #         data["Sharpe Ratio"] = None
    # except Exception:
    #     data["Sharpe Ratio"] = None

    # --- Returns ---
    perf = {}
    for label in ["1 Year Returns", "3 Year Returns", "5 Year Returns"]:
        li = soup.find("li", string=lambda s: s and label in s)
        if li:
            percent_span = li.find('span')
            if percent_span:
                perf[label] = percent_span.text.strip()
            else:
                match = re.search(r"[\d\.-]+%", li.text)
                perf[label] = match.group(0) if match else None
    data["Returns"] = perf

    return data

if __name__ == "__main__":
    info = scrape_parag_parikh(URL)
    print(json.dumps(info, indent=2))
