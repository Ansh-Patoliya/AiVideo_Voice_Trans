import sys
import json
import logging
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fb_sniffer")

def extract_video_url(ad_url: str) -> dict:
    found_video_url = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ]
            )
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
            page = context.new_page()

            def on_response(response):
                nonlocal found_video_url
                try:
                    resp_url = response.url
                    content_type = response.headers.get("content-type", "")
                    if (".mp4" in resp_url and "fbcdn.net" in resp_url) or ("video/" in content_type and "fbcdn" in resp_url):
                        found_video_url = resp_url
                except Exception:
                    pass

            page.on("response", on_response)

            try:
                logger.info(f"Navigating to FB Ad: {ad_url}")
                page.goto(ad_url, wait_until="domcontentloaded", timeout=25000)

                # Wait for response
                for _ in range(24):
                    if found_video_url:
                        break
                    page.wait_for_timeout(500)

                if not found_video_url:
                    play_btns = page.query_selector_all('video, [role="button"], button')
                    for btn in play_btns[:5]:
                        try:
                            btn.click(timeout=1000)
                        except Exception:
                            pass
                    for _ in range(10):
                        if found_video_url:
                            break
                        page.wait_for_timeout(500)

                if not found_video_url:
                    video_elem = page.query_selector("video")
                    if video_elem:
                        src = video_elem.get_attribute("src")
                        if src and src.startswith("http"):
                            found_video_url = src
            finally:
                browser.close()

        if found_video_url:
            return {"success": True, "url": found_video_url}
        else:
            return {"success": False, "error": "No playable video found in page."}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing URL argument"}))
        sys.exit(1)
    
    target_url = sys.argv[1]
    result = extract_video_url(target_url)
    print(json.dumps(result))
