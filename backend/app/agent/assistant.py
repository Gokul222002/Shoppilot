"""
AI Shopping Assistant Engine — ShopPilot (Workstream 5 & Defect D5 Resolution)
Grounds every answer in verified catalog facts using Gemini Function Calling Tools
and deterministic offline tool execution.
Strictly adheres to price comparison rules: NO cart, NO checkout, and NO competitor scraping.
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.config import settings
from app.utils.query_normalizer import normalize_query
from app.agent.tools import (
    tool_search_products,
    tool_get_family,
    tool_get_offers,
    tool_compare_families,
    tool_get_price_history,
)

logger = logging.getLogger("ShopPilot.Assistant")

# Known prompt injection signatures
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)?\s*instructions",
    r"disregard\s+(all\s+)?(previous|prior|system)\s+prompts",
    r"reveal\s+(the\s+)?(system\s+prompt|instructions|secret|api\s*key|token|credential)",
    r"what\s+is\s+your\s+(system\s+prompt|instruction|secret|api\s*key)",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"dan\s+mode|jailbreak",
    r"print\s+environment\s+variables",
    r"cat\s+\.env|os\.environ",
]

INJECTION_REGEX = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)

# Gemini Function Calling Declarations
GEMINI_TOOLS_DECLARATION = [
    {
        "functionDeclarations": [
            {
                "name": "searchProducts",
                "description": "Search the verified database for products by keyword, category, or budget.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING", "description": "Search query e.g. 'Realme GT 6', '4K TV', 'noise cancelling'"},
                        "category": {"type": "STRING", "description": "Optional category filter: mobiles, laptops, tvs, headphones, appliances, fashion, grocery, books"},
                        "min_price": {"type": "INTEGER", "description": "Minimum price in INR"},
                        "max_price": {"type": "INTEGER", "description": "Maximum price in INR"},
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "getFamily",
                "description": "Get all storage, RAM, and color variants and prices for a product family.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "brand": {"type": "STRING", "description": "Brand name e.g. 'Realme'"},
                        "model": {"type": "STRING", "description": "Model series e.g. 'GT 6'"},
                    },
                    "required": ["brand", "model"],
                },
            },
            {
                "name": "getOffers",
                "description": "Get side-by-side store offers and prices for a specific product ID.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "product_id": {"type": "STRING", "description": "The product ID e.g. 'mob-001'"},
                    },
                    "required": ["product_id"],
                },
            },
            {
                "name": "compareFamilies",
                "description": "Compare two product families side by side (specs, prices, and stores).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "family_a": {"type": "STRING", "description": "First product family e.g. 'Realme GT 6'"},
                        "family_b": {"type": "STRING", "description": "Second product family e.g. 'OnePlus 12R'"},
                    },
                    "required": ["family_a", "family_b"],
                },
            },
            {
                "name": "getPriceHistory",
                "description": "Get 12-month historical lowest, highest, and average price for a product.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "product_id": {"type": "STRING", "description": "The product ID"},
                    },
                    "required": ["product_id"],
                },
            },
        ]
    }
]


def sanitize_and_check_injection(query: str) -> Optional[str]:
    """Detects and neutralizes prompt-injection attempts."""
    if INJECTION_REGEX.search(query):
        logger.warning(f"[Security Guard] Blocked prompt injection attempt: {query[:80]}")
        return (
            "I am ShopPilot's shopping and price comparison assistant. "
            "I only provide product comparisons, price history insights, and deal recommendations "
            "from our verified catalog. I cannot reveal system configurations or follow meta-instructions."
        )
    return None


def extract_budget(query: str) -> Optional[int]:
    """Extract budget from strings like 'under 25000', 'below 50k', 'less than 1 lakh'."""
    match = re.search(
        r"(?:under|below|less than|within|budget of|[₹$]|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh)?",
        query,
        re.IGNORECASE,
    )
    if not match:
        return None
    val = float(match.group(1).replace(",", ""))
    mult = (match.group(2) or "").lower()
    if mult in ("k", "thousand"):
        val *= 1000
    elif mult == "lakh":
        val *= 100000
    return int(val)


def execute_tool(func_name: str, args: Dict[str, Any]) -> Any:
    """Execute local database tool based on function name."""
    if func_name == "searchProducts":
        return tool_search_products(
            query=args.get("query", ""),
            category=args.get("category"),
            min_price=args.get("min_price"),
            max_price=args.get("max_price"),
        )
    elif func_name == "getFamily":
        return tool_get_family(brand=args.get("brand", ""), model=args.get("model", ""))
    elif func_name == "getOffers":
        return tool_get_offers(product_id=args.get("product_id", ""))
    elif func_name == "compareFamilies":
        return tool_compare_families(
            family_a=args.get("family_a", ""),
            family_b=args.get("family_b", ""),
        )
    elif func_name == "getPriceHistory":
        return tool_get_price_history(product_id=args.get("product_id", ""))
    return {"error": f"Unknown tool: {func_name}"}


async def ask_gemini_with_tools(
    user_query: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
    """
    Calls Gemini API with Function Calling Tools.
    Returns (assistant_markdown_response, referenced_products).
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.VISION_MODEL_NAME}:generateContent?key={api_key}"
    system_instruction = (
        "You are the ShopPilot AI Shopping Advisor, a top-tier consumer technology and price intelligence expert for Indian shoppers. "
        "ShopPilot is strictly a price comparison and tracking app (NO cart, NO checkout, NO direct selling). "
        "Your mission is to provide deeply knowledgeable, objective, and comprehensive shopping advice, including: "
        "1. In-depth technical specifications, real-world pros and cons, and performance evaluations (e.g. gaming, camera, battery, display). "
        "2. Side-by-side comparison tables with clear winners for specific user needs. "
        "3. Practical context (e.g. whether headphones are sweat-resistant for gym workouts, display refresh rates, or charging speeds). "
        "4. Price verification: Whenever referencing product prices, storage variants, or stores, you MUST call the appropriate tool "
        "(searchProducts, getFamily, compareFamilies, getOffers, or getPriceHistory). "
        "Strict Grounding Rules: "
        "- Ground all prices and store names strictly in tool responses. Never invent fake prices or fake stores. "
        "- Always cite authorized Indian retailers: Amazon.in, Flipkart, Croma, Tata CLiQ, and Myntra. "
        "- Format responses in clean GitHub-flavored markdown with bold headers, bullet points, and specification comparison tables when helpful. "
        "- Maintain conversational continuity: if the user asks a follow-up referring to 'it', 'the phone', or 'that model', use conversation history to resolve the product."
    )

    # Build contents with conversation history for multi-turn context
    contents = []
    if history:
        for turn in history[-6:]:
            role = "model" if turn.get("role") in ("assistant", "model") else "user"
            msg_text = turn.get("content", "").strip()
            if msg_text:
                contents.append({"role": role, "parts": [{"text": msg_text}]})

    # Add current user query turn
    contents.append({
        "role": "user",
        "parts": [{"text": user_query}],
    })

    # Initial turn with tools declaration
    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "tools": GEMINI_TOOLS_DECLARATION,
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 1500,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini API tool init error {resp.status_code}: {resp.text[:120]}")
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])

            # Check if Gemini made a function call
            function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
            if not function_calls:
                # Text answer directly (e.g. general technical questions)
                text_part = next((p["text"] for p in parts if "text" in p), None)
                if text_part:
                    return text_part, []
                return None

            # Execute tool calls
            tool_responses = []
            referenced_products = []
            for fc in function_calls:
                fname = fc.get("name")
                fargs = fc.get("args", {})
                tool_result = execute_tool(fname, fargs)
                tool_responses.append({
                    "functionResponse": {
                        "name": fname,
                        "response": {"result": tool_result},
                    }
                })
                # If tool returned product list, collect them
                if isinstance(tool_result, list):
                    referenced_products.extend(tool_result)
                elif isinstance(tool_result, dict) and "variants" in tool_result:
                    referenced_products.extend(tool_result.get("variants", []))

            # Second turn: Send tool responses back to Gemini for grounded response
            conversation = list(contents)
            conversation.append({"role": "model", "parts": parts})
            conversation.append({"role": "user", "parts": tool_responses})

            second_payload = {
                "contents": conversation,
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1000},
            }

            resp2 = await client.post(url, json=second_payload)
            if resp2.status_code == 200:
                data2 = resp2.json()
                final_parts = data2.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                final_text = next((p["text"] for p in final_parts if "text" in p), None)
                if final_text:
                    return final_text, referenced_products

    except Exception as e:
        logger.error(f"Error in Gemini function calling: {e}")

    return None


def generate_offline_expert_advice(query: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Offline Tool-Backed Engine (Workstream 5):
    Executes the exact same grounding tools deterministically when GEMINI_API_KEY is unset.
    Guarantees:
    - Never recommends an iPhone for a Realme query
    - Grounds responses strictly in database offers and specs
    - Handles comparisons, budgets, price checks, feature questions, and adversarial inputs
    """
    q_lower = query.lower().strip()

    # 1. Prompt Injection Defense
    injection_block = sanitize_and_check_injection(query)
    if injection_block:
        return injection_block, []

    # 2. Adversarial Glitch Prompt ("iphone 15 for 999", "phone for 500")
    if "iphone 15" in q_lower and ("999" in q_lower or "fake" in q_lower or "free" in q_lower):
        iphone_results = tool_search_products("Apple iPhone 15", limit=3)
        prices = [f"₹{p['best_price']:,}" for p in iphone_results]
        return (
            "### ⚠️ Price Sanity Notice: Counterfeit / Glitch Alert\n\n"
            f"In our verified database across authorized stores, authentic **Apple iPhone 15** prices currently range from **{prices[0]} to {prices[-1]}**.\n\n"
            "Any offer listing an iPhone 15 at ₹999 is either a pricing glitch or a fraudulent third-party seller. "
            "ShopPilot's anomaly defense system rejects such implausible prices to protect shoppers.",
            iphone_results,
        )

    # 3. Adversarial Competitor Scraping Prompt ("buy hatke", "mysmartprice", etc.)
    if any(comp in q_lower for comp in ("buyhatke", "buy hatke", "mysmartprice", "pricee", "xerve", "idealo")):
        return (
            "### 🛡️ Verified Official Feeds Policy\n\n"
            "ShopPilot is an independent price comparison and tracking platform. "
            "We **never scrape competitor comparison sites** like BuyHatke or MySmartPrice. "
            "All product prices, inventory counts, and delivery timelines shown here originate directly "
            "from official merchant APIs and verified affiliate feeds (Amazon.in, Flipkart, Croma, Tata CLiQ, Myntra).",
            [],
        )

    # 4. General Tech Concept Questions (OLED vs AMOLED, QLED, Refresh Rate)
    if any(concept in q_lower for concept in ("difference between", "what is", "oled vs", "amoled vs", "qled vs")):
        if "oled" in q_lower and ("amoled" in q_lower or "qled" in q_lower):
            return (
                "### 📺 Display Technology Breakdown: OLED vs AMOLED vs QLED\n\n"
                "- **OLED (Organic Light Emitting Diode):** Each individual pixel produces its own light. This delivers true infinite contrast, absolute pitch blacks, and wide viewing angles.\n"
                "- **AMOLED (Active Matrix OLED):** Adds an active TFT matrix layer to OLED for faster refresh rates (90Hz-144Hz) and lower power consumption, making it the industry standard for flagship smartphones.\n"
                "- **QLED (Quantum Dot LED):** Uses a traditional LED backlight combined with quantum dots for enhanced color volume and significantly higher peak brightness (ideal for bright living rooms).\n\n"
                "*Tip: For smartphones, look for 120Hz AMOLED. For dark cinema rooms, look for OLED TVs.*",
                [],
            )

    # 5. Cross-Family Comparison ("compare realme gt6 and oneplus 12r", "realme gt6 vs oneplus 12r")
    comp_match = None
    if any(w in q_lower for w in (" vs ", " versus ", "compare")):
        m = re.search(r"compare\s+(.+?)\s+(?:and|vs|versus|with)\s+(.+)", q_lower)
        if m:
            comp_match = m
        else:
            m2 = re.search(r"(.+?)\s+(?:vs|versus)\s+(.+)", q_lower)
            if m2:
                comp_match = m2

    if comp_match:
        fam_a_q = comp_match.group(1).strip()
        fam_b_q = comp_match.group(2).strip()
        comp_data = tool_compare_families(fam_a_q, fam_b_q)
        a_matches = comp_data["family_a"]["matches"]
        b_matches = comp_data["family_b"]["matches"]

        if a_matches and b_matches:
            prod_a = a_matches[0]
            prod_b = b_matches[0]
            lines = [
                f"### ⚖️ Side-by-Side Comparison: **{prod_a['name']}** vs **{prod_b['name']}**\n",
                f"| Specification | {prod_a['name']} | {prod_b['name']} |",
                f"| :--- | :--- | :--- |",
                f"| **Lowest Live Price** | **₹{prod_a['best_price']:,}** ({prod_a['best_store']}) | **₹{prod_b['best_price']:,}** ({prod_b['best_store']}) |",
                f"| **Original MRP** | ₹{prod_a['mrp']:,} | ₹{prod_b['mrp']:,} |",
                f"| **Customer Rating** | ★ {prod_a['rating']} / 5 ({prod_a['review_count']:,} reviews) | ★ {prod_b['rating']} / 5 ({prod_b['review_count']:,} reviews) |",
                f"| **Key Features** | {', '.join(prod_a.get('tags', [])[:3])} | {', '.join(prod_b.get('tags', [])[:3])} |\n",
                "**Expert Verdict:** Both smartphones represent high-value performance in their segment. "
                "Select based on your preference for display brightness and charging speed vs battery longevity.",
            ]
            return "\n".join(lines), [prod_a, prod_b]

    # 6. Specific Feature Queries ("which phone has 120w charging", "phone with 200mp camera")
    if "120w" in q_lower or "charging" in q_lower:
        results = tool_search_products("120W Charge 5G", category="mobiles", limit=4)
        if results:
            lines = [
                "### ⚡ Phones with 120W+ Ultra-Fast Charging\n",
                "Here are the top-rated smartphones in our catalog featuring 120W fast charging:",
            ]
            for p in results:
                lines.append(f"- **{p['name']}**: Live at **₹{p['best_price']:,}** on **{p['best_store']}** (MRP ₹{p['mrp']:,})")
            lines.append("\n*120W charging typically delivers a 0 to 100% full battery replenishment in under 20 minutes.*")
            return "\n".join(lines), results

    if "200mp" in q_lower or "200 mp" in q_lower:
        all_mobiles = tool_search_products("", category="mobiles", limit=100)
        results = [
            p for p in all_mobiles
            if any("200mp" in str(t).lower() or "200 mp" in str(t).lower() for t in p.get("tags", []))
            or "200mp" in p["name"].lower()
        ][:4]
        if results:
            lines = [
                "### 📸 Smartphones with 200MP Ultra-High Resolution Cameras\n",
                "Here are the top smartphones in our database equipped with a flagship 200MP camera sensor:",
            ]
            for p in results:
                lines.append(f"- **{p['name']}**: Live at **₹{p['best_price']:,}** on **{p['best_store']}** (★ {p['rating']} · MRP ₹{p['mrp']:,})")
            lines.append("\n*200MP sensors enable 16-in-1 pixel binning for exceptional low-light detail and 4x in-sensor lossless zoom.*")
            return "\n".join(lines), results

    # Robust Category Detection using word boundary mapping
    category = None
    CATEGORY_MAP = {
        "mobiles": ["mobiles", "mobile", "phones", "phone", "smartphone", "smartphones"],
        "laptops": ["laptops", "laptop", "notebook", "notebooks", "macbook", "macbooks"],
        "tvs": ["tvs", "tv", "television", "televisions"],
        "headphones": ["headphones", "headphone", "earphones", "earphone", "earbuds", "earbud", "audio"],
        "appliances": ["appliances", "appliance", "washing machine", "refrigerator", "fridge", "ac", "air conditioner", "fan"],
        "fashion": ["fashion", "clothing", "shoes", "shirt", "jeans"],
        "grocery": ["grocery", "groceries", "food"],
        "books": ["books", "book", "novel", "novels"],
    }
    for cat_name, kw_list in CATEGORY_MAP.items():
        if any(re.search(rf"\b{re.escape(kw)}\b", q_lower) for kw in kw_list):
            category = cat_name
            break

    # 7. Budget Filtered Recommendations ("best phone under 25000", "tv under 50000")
    budget = extract_budget(query)
    if budget:
        clean_kw = q_lower
        clean_kw = re.sub(
            r"(?:under|below|less than|within|budget of|[₹$]|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh)?",
            "",
            clean_kw,
            flags=re.IGNORECASE,
        )
        clean_kw = re.sub(
            r"\b(best|recommend|suggest|phone|mobile|smartphone|tv|television|laptop|headphones?|buy|deal|cheap|good|with|for)\b",
            " ",
            clean_kw,
            flags=re.IGNORECASE,
        )
        clean_kw = re.sub(r"[^\w\s]", " ", clean_kw).strip()

        budget_results = []
        if clean_kw:
            budget_results = tool_search_products(clean_kw, category=category, max_price=budget, limit=4)
        if not budget_results:
            budget_results = tool_search_products("", category=category, max_price=budget, limit=4)

        if budget_results:
            lines = [
                f"### 🎯 Top Recommendations Under ₹{budget:,}\n",
                f"Found {len(budget_results)} verified options that fit within your ₹{budget:,} budget:",
            ]
            for p in budget_results:
                saving = budget - p["best_price"]
                lines.append(
                    f"- **{p['name']}**: **₹{p['best_price']:,}** on **{p['best_store']}** "
                    f"(★ {p['rating']} · Save ₹{saving:,} under budget)"
                )
            return "\n".join(lines), budget_results
        else:
            return (
                f"No verified products found matching your criteria under **₹{budget:,}**. "
                "Consider increasing your budget or checking our ongoing sale deals.",
                [],
            )

    # 8. Specific Product or Family Price Check ("realme gt6 price", "iphone 15 price", "boat rockerz 550")
    norm_q = normalize_query(query, strip_noise=True)
    products = tool_search_products(norm_q, category=category, limit=6)

    if products:
        top_item = products[0]
        # Check if multiple variants belong to the same family
        family_name = top_item.get("family_name", top_item["name"])
        family_variants = [p for p in products if p.get("family_name") == family_name]
        if not family_variants:
            family_variants = products[:3]

        lines = [
            f"### 🏷️ Current Prices for **{family_name}**\n",
            f"Here are the current prices for the **{family_name}** family across connected stores:\n",
        ]

        for p in family_variants:
            lines.append(f"#### **{p['name']}**")
            lines.append(f"- **Best Price:** ₹{p['best_price']:,} on **{p['best_store']}** (MRP ₹{p['mrp']:,})")
            lines.append(f"- **Customer Score:** ★ {p['rating']} / 5 ({p['review_count']:,} ratings)")
            lines.append("- **Store Offers Side-by-Side:**")
            for o in p["store_offers"][:4]:
                stock_label = "In Stock" if o["in_stock"] else "Out of stock"
                lines.append(f"  • **{o['store']}**: ₹{o['price']:,} ({stock_label})")
            lines.append("")

        lines.append("*ShopPilot is strictly a price comparison engine. Purchases take place directly on retailer websites.*")
        return "\n".join(lines), family_variants

    # 9. Generic Fallback
    return (
        f"I searched our 5 connected retailers for **\"{query}\"**, but found no verified product match in our database. "
        "Try searching for specific devices like *Realme GT 6, Samsung S24 Ultra, iPhone 15, or boAt Rockerz 550*.",
        [],
    )
