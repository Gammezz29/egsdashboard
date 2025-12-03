import html
import urllib.request
url = "https://elevenlabs.io/docs/api-reference/conversations/list"
with urllib.request.urlopen(url) as resp:
    text = html.unescape(resp.read().decode("utf-8", "ignore"))
marker = "Query parameters"
idx = text.find(marker)
print(text[idx:idx+800])
