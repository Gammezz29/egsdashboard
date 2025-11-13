import html
import urllib.request
url = "https://elevenlabs.io/docs/api-reference/agents/list"
with urllib.request.urlopen(url) as resp:
    text = html.unescape(resp.read().decode("utf-8", "ignore"))
needle = 'curl https://api.'
idx = text.find(needle)
if idx != -1:
    snippet = text[idx:idx+200]
    print(snippet)
