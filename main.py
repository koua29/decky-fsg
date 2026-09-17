"""FSG backend.

Finds Steam "free to keep" promotions (100 % off) straight from the Steam store
and adds them to the account, on demand or automatically.

The Steam session is read locally from Steam's own browser through the CEF
DevTools port that Decky already relies on (127.0.0.1:8080). It is only ever
sent to store.steampowered.com.
"""
import asyncio
import base64
import html
import json
import os
import re
import secrets
import socket
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

import decky

STORE = "https://store.steampowered.com"
SEARCH_QUERY = "maxprice=free&specials=1"
CEF_HOST, CEF_PORT = "127.0.0.1", 8080
USER_AGENT = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
AGE_COOKIES = {"birthtime": "0", "lastagecheckage": "1-0-1990", "wants_mature_content": "1"}

FIRST_CHECK_DELAY = 45   # seconds after the plugin starts
CHECK_INTERVAL = 3600    # seconds between two automatic checks
MAX_ATTEMPTS = 3         # automatic claim attempts per package before giving up
MAX_CANDIDATES = 30

DEFAULT_SETTINGS = {"auto_claim": True, "include_dlc": False, "notify": True, "language": "en", "beta": False}
STEAM_LANG = {"en": "english", "fr": "french"}  # store pages and prices follow the interface
_lang = "en"
SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
MEMORY_FILE = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "memory.json")


# --------------------------------------------------------------------------- storage

def _set_lang(code):
    """Interface language, chosen by the frontend from Steam's own locale."""
    global _lang
    _lang = code if code in STEAM_LANG else "en"


def _l():
    return STEAM_LANG[_lang]


def _load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def _save(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


# --------------------------------------------------------------------------- HTTP

def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    for path in ("/etc/ssl/certs/ca-certificates.crt",
                 "/etc/ca-certificates/extracted/tls-ca-bundle.pem"):
        if os.path.exists(path):
            return ssl.create_default_context(cafile=path)
    return ssl.create_default_context()


_SSL = _ssl_context()


def _http(url, data=None, cookies=None, timeout=20):
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"}
    if cookies:
        headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["Origin"] = STORE
        headers["Referer"] = STORE + "/"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL) as resp:
        return resp.read().decode("utf-8", "replace")


# --------------------------------------------------------------------------- CEF DevTools
# A tiny stdlib WebSocket client, just enough to send one DevTools command to
# Steam's browser and read the answer.

class _WsReader:
    def __init__(self, sock):
        self.sock = sock
        self.buf = b""

    def _fill(self):
        chunk = self.sock.recv(65536)
        if not chunk:
            raise ConnectionError("WebSocket closed")
        self.buf += chunk

    def read_until(self, marker):
        while marker not in self.buf:
            self._fill()
        head, self.buf = self.buf.split(marker, 1)
        return head

    def read(self, n):
        while len(self.buf) < n:
            self._fill()
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def read_message(self):
        parts = []
        while True:
            b0, b1 = self.read(2)
            opcode, length = b0 & 0x0F, b1 & 0x7F
            if length == 126:
                length = int.from_bytes(self.read(2), "big")
            elif length == 127:
                length = int.from_bytes(self.read(8), "big")
            mask = self.read(4) if b1 & 0x80 else None
            payload = self.read(length)
            if mask:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if opcode == 0x8:
                raise ConnectionError("WebSocket closed by peer")
            if opcode in (0x9, 0xA):  # ping / pong
                continue
            parts.append(payload)
            if b0 & 0x80:
                return b"".join(parts).decode("utf-8", "replace")


def _ws_send(sock, payload):
    header = bytearray([0x81])  # FIN + text frame
    n = len(payload)
    if n < 126:
        header.append(0x80 | n)
    elif n < 1 << 16:
        header.append(0x80 | 126)
        header += n.to_bytes(2, "big")
    else:
        header.append(0x80 | 127)
        header += n.to_bytes(8, "big")
    mask = secrets.token_bytes(4)
    header += mask
    sock.sendall(bytes(header) + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))


def _cdp_call(ws_url, method, params=None, timeout=5):
    msg_id = secrets.randbelow(1_000_000) + 1
    url = urllib.parse.urlparse(ws_url)
    sock = socket.create_connection((url.hostname, url.port or 80), timeout=timeout)
    try:
        key = base64.b64encode(secrets.token_bytes(16)).decode()
        sock.sendall((f"GET {url.path} HTTP/1.1\r\nHost: {url.netloc}\r\n"
                      "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                      f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        reader = _WsReader(sock)
        status = reader.read_until(b"\r\n\r\n").split(b"\r\n", 1)[0]
        if b" 101" not in status:
            raise ConnectionError(f"WebSocket handshake refused: {status.decode(errors='replace')}")
        _ws_send(sock, json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode())
        while True:
            reply = json.loads(reader.read_message())
            if reply.get("id") == msg_id:
                if "error" in reply:
                    raise ValueError(f"{method}: {reply['error']}")
                return reply.get("result", {})
    finally:
        sock.close()


def _steam_cookies():
    """Store cookies of Steam's built-in browser, read through CEF DevTools."""
    with urllib.request.urlopen(f"http://{CEF_HOST}:{CEF_PORT}/json", timeout=5) as resp:
        targets = [t for t in json.load(resp) if t.get("webSocketDebuggerUrl")]
    targets.sort(key=lambda t: (t.get("title") != "SharedJSContext", t.get("type") != "page"))
    for target in targets[:8]:
        try:
            result = _cdp_call(target["webSocketDebuggerUrl"], "Network.getCookies",
                               {"urls": [STORE + "/"]})
        except (OSError, ValueError) as e:
            decky.logger.debug("DevTools %s: %s", target.get("title"), e)
            continue
        cookies = {c["name"]: c["value"] for c in result.get("cookies", [])}
        if cookies.get("steamLoginSecure"):
            return cookies
    return {}


def _session():
    try:
        cookies = _steam_cookies()
    except (OSError, ValueError) as e:
        decky.logger.warning("Steam DevTools unreachable: %s", e)
        return None
    if not cookies.get("steamLoginSecure"):
        return None
    # sessionid is only a CSRF token compared with its cookie: any value works if both match.
    return {"steamLoginSecure": cookies["steamLoginSecure"],
            "sessionid": cookies.get("sessionid") or secrets.token_hex(12)}


# --------------------------------------------------------------------------- Steam store

_FREE_FORM = re.compile(r'<form[^>]*action="[^"]*/freelicense/addfreelicense/?"[^>]*>(.*?)</form>', re.S)
_SUBID = re.compile(r'name="subid"\s+value="(\d+)"')
_COUNTDOWN = re.compile(r'class="game_purchase_discount_countdown">([^<]+)<')


def _search_candidates(query=None):
    """App ids the store lists at 0 € with a discount, i.e. free to keep."""
    url = f"{STORE}/search/results/?query&start=0&count=100&{query or SEARCH_QUERY}&infinite=1&l={_l()}"
    rows = json.loads(_http(url)).get("results_html", "")
    appids = []
    for appid in map(int, re.findall(r'data-ds-appid="(\d+)"', rows)):
        if appid not in appids:
            appids.append(appid)
    return appids[:MAX_CANDIDATES]


def _app_page_info(appid):
    """Free-licence package ids offered on the store page, and the offer's end text."""
    page = _http(f"{STORE}/app/{appid}/?l={_l()}", cookies=AGE_COOKIES)
    subids = []
    for form in _FREE_FORM.finditer(page):
        m = _SUBID.search(form.group(1))
        if m:
            subids.append(int(m.group(1)))
    m = _COUNTDOWN.search(page)
    ends = " ".join(html.unescape(m.group(1)).split()) if m else ""
    return subids, ends


def _build_game(appid):
    raw = json.loads(_http(f"{STORE}/api/appdetails?appids={appid}&l={_l()}")).get(str(appid)) or {}
    if not raw.get("success"):
        return None
    data = raw["data"]
    subids, ends = _app_page_info(appid)
    if not subids:
        subids = [s["packageid"] for g in data.get("package_groups", []) for s in g.get("subs", [])
                  if s.get("is_free_license") or s.get("price_in_cents_with_discount") == 0]
    price = data.get("price_overview") or {}
    return {
        "appid": appid,
        "subid": subids[0] if subids else None,
        "name": data.get("name") or f"App {appid}",
        "type": data.get("type") or "game",
        "image": data.get("header_image", ""),
        "original_price": price.get("initial_formatted", ""),
        "price_cents": price.get("initial") or 0,
        "currency": price.get("currency") or "",
        "ends": ends,
        "owned": False,
    }


def _price(appid):
    """Normal price of a single app, in cents."""
    return _prices([appid]).get(int(appid), (0, ""))


PRICE_BATCH = 60          # app ids the store accepts in one price request
PRICE_PAUSE = 1.0         # seconds between two batches, to stay polite


def _prices(appids):
    """Normal price of many apps at once. Only `price_overview` supports batching."""
    prices = {}
    for start in range(0, len(appids), PRICE_BATCH):
        chunk = appids[start:start + PRICE_BATCH]
        ids = ",".join(str(a) for a in chunk)
        raw = json.loads(_http(f"{STORE}/api/appdetails?appids={ids}&filters=price_overview&l={_l()}")) or {}
        for appid, entry in raw.items():
            data = entry.get("data")
            price = (data or {}).get("price_overview") or {} if isinstance(data, dict) else {}
            prices[int(appid)] = (price.get("initial") or 0, price.get("currency") or "")
        if start + PRICE_BATCH < len(appids):
            time.sleep(PRICE_PAUSE)
    return prices


def _owned(session):
    data = json.loads(_http(f"{STORE}/dynamicstore/userdata/?t={int(time.time())}", cookies=session))
    return set(data.get("rgOwnedApps", [])), set(data.get("rgOwnedPackages", []))


def _fetch_games(include_dlc):
    games = []
    for appid in _search_candidates():
        try:
            game = _build_game(appid)
        except (OSError, ValueError) as e:
            decky.logger.warning("App %s skipped: %s", appid, e)
            continue
        if game and (game["type"] == "game" or include_dlc):
            games.append(game)
    session = _session()
    if session and games:
        try:
            apps, packages = _owned(session)
        except (OSError, ValueError) as e:
            decky.logger.warning("Ownership check failed: %s", e)
        else:
            for game in games:
                game["owned"] = game["appid"] in apps or game["subid"] in packages
    return games, session


def _claim_license(session, game):
    try:
        reply = _http(f"{STORE}/freelicense/addfreelicense/{game['subid']}",
                      data={"ajax": "true", "sessionid": session["sessionid"]}, cookies=session)
        decky.logger.info("addfreelicense %s -> %s", game["subid"], reply[:200])
    except urllib.error.HTTPError as e:
        return False, "http_error", str(e.code)
    # The reply format is undocumented: trust the account's licence list instead.
    for delay in (1, 3, 5):
        time.sleep(delay)
        apps, packages = _owned(session)
        if game["appid"] in apps or game["subid"] in packages:
            return True, "added", ""
    return False, "not_confirmed", ""


# --------------------------------------------------------------------------- updates

REPO = "koua29/decky-fsg"
ZIP_NAME = "FSG.zip"
UPDATE_INTERVAL = 86400  # one GitHub check per day
CURRENT_VERSION = getattr(decky, "DECKY_PLUGIN_VERSION", "0.0.0")


_PRERELEASE = re.compile(r"-(?:beta|rc|alpha)\.?(\d+)?", re.I)


def _version_key(version):
    """Sortable version: 0.4.0-beta.2 sits after 0.3.9 but before 0.4.0."""
    numbers = tuple(int(n) for n in re.findall(r"\d+", version.split("-", 1)[0])[:3])
    numbers += (0,) * (3 - len(numbers))
    pre = _PRERELEASE.search(version)
    return numbers + ((0, int(pre.group(1) or 0)) if pre else (1, 0))


def _latest_release(current, beta=False):
    """Newest release of the chosen channel, compared with the installed version."""
    if beta:
        releases = [r for r in json.loads(_http(f"https://api.github.com/repos/{REPO}/releases?per_page=20"))
                    if not r.get("draft")]
        release = max(releases, key=lambda r: _version_key(r.get("tag_name", "")), default={})
    else:
        release = json.loads(_http(f"https://api.github.com/repos/{REPO}/releases/latest"))
    asset = next((a for a in release.get("assets", []) if a.get("name") == ZIP_NAME), {})
    latest = release.get("tag_name", "").lstrip("v")
    digest = asset.get("digest") or ""
    return {
        "current": current,
        "latest": latest,
        "available": bool(asset) and _version_key(latest) > _version_key(current),
        # Leaving the beta channel while running a beta build: offer the stable one back.
        "rollback": bool(asset) and not beta and _version_key(latest) < _version_key(current),
        "prerelease": bool(release.get("prerelease")),
        "channel": "beta" if beta else "stable",
        "title": release.get("name", ""),
        "notes": (release.get("body") or "")[:800],
        "url": release.get("html_url", ""),
        "zip_url": asset.get("browser_download_url", ""),
        "zip_sha256": digest[7:] if digest.startswith("sha256:") else "",
    }


# --------------------------------------------------------------------------- plugin

class Plugin:
    settings = dict(DEFAULT_SETTINGS)
    memory = {"seen": [], "attempts": {}, "claimed": [], "totals": {}, "counted": [], "library": {}}
    games = []
    last_check = 0
    logged_in = None
    error = ""
    checking = False
    update = None
    last_update_check = 0
    lock = None
    task = None
    stats_task = None
    computing_stats = False

    async def _main(self):
        self.lock = asyncio.Lock()
        self.settings = {**DEFAULT_SETTINGS, **_load(SETTINGS_FILE, {})}
        _set_lang(self.settings["language"])
        self.memory = {"seen": [], "attempts": {}, "claimed": [], "counted": [],
                       "totals": {"count": 0, "cents": 0, "currency": ""},
                       "library": {"count": 0, "cents": 0, "currency": "", "priced": 0, "ts": 0},
                       **_load(MEMORY_FILE, {})}
        self.task = asyncio.get_event_loop().create_task(self._loop())
        decky.logger.info("FSG started")

    async def _unload(self):
        for task in (self.task, self.stats_task):
            if task:
                task.cancel()

    # ---- called by the frontend

    async def get_state(self):
        return self._snapshot()

    async def refresh(self):
        await self._check()
        return self._snapshot()

    async def claim(self, appid):
        async with self._get_lock():
            game = next((g for g in self.games if g["appid"] == appid), None)
            if game is None:
                return {"ok": False, "code": "not_found", "detail": ""}
            ok, code, detail = await self._claim(game)
            _save(MEMORY_FILE, self.memory)
        return {"ok": ok, "code": code, "detail": detail}

    async def set_setting(self, key, value):
        if key == "language":
            _set_lang(str(value))
            self.settings["language"] = _lang
            _save(SETTINGS_FILE, self.settings)
            # Names and prices come from the store in that language: fetch them again.
            asyncio.get_event_loop().create_task(self._check())
        elif key == "beta":
            self.settings["beta"] = bool(value)
            _save(SETTINGS_FILE, self.settings)
            asyncio.get_event_loop().create_task(self._check_update())
        elif key in DEFAULT_SETTINGS:
            self.settings[key] = bool(value)
            _save(SETTINGS_FILE, self.settings)
            if key == "include_dlc" or (key == "auto_claim" and value):
                asyncio.get_event_loop().create_task(self._check())
        return self.settings

    async def recompute_stats(self):
        """Prices the claimed games and the library. Only ever runs on the user's request."""
        if self.computing_stats:
            return self._snapshot()
        self.computing_stats = True
        await decky.emit("fsg_state", self._snapshot())
        try:
            await self._backfill_prices()
            await self._estimate_library()
        except Exception as e:
            decky.logger.exception("Statistics failed")
            self.error = str(e)
        finally:
            self.computing_stats = False
        await decky.emit("fsg_state", self._snapshot())
        return self._snapshot()

    async def check_update(self):
        return self.update if await self._check_update() else None

    # ---- internals

    def _get_lock(self):
        if self.lock is None:
            self.lock = asyncio.Lock()
        return self.lock

    def _snapshot(self):
        return {
            "games": self.games,
            "last_check": self.last_check,
            "logged_in": self.logged_in,
            "error": self.error,
            "checking": self.checking,
            "settings": self.settings,
            "claimed": self.memory["claimed"][::-1],
            "version": CURRENT_VERSION,
            "update": self.update,
            "totals": self.memory["totals"],
            "library": self.memory["library"],
            "computing_stats": self.computing_stats,
        }

    async def _loop(self):
        await asyncio.sleep(FIRST_CHECK_DELAY)
        while True:
            for job in (self._check, self._check_update_if_due):
                try:
                    await job()
                except asyncio.CancelledError:
                    raise
                except Exception:
                    decky.logger.exception("Automatic %s failed", job.__name__)
            await asyncio.sleep(CHECK_INTERVAL)

    async def _estimate_library(self, session=None):
        """Rough worth of everything the account owns, priced in batches."""
        session = session or await asyncio.to_thread(_session)
        if not session:
            return
        apps, _ = await asyncio.to_thread(_owned, session)
        prices = await asyncio.to_thread(_prices, sorted(apps))
        priced = [(cents, currency) for cents, currency in prices.values() if cents]
        self.memory["library"] = {
            "count": len(apps),
            "cents": sum(cents for cents, _ in priced),
            "currency": next((c for _, c in priced if c), self.memory["totals"].get("currency", "")),
            "priced": len(priced),
            "ts": int(time.time()),
        }
        _save(MEMORY_FILE, self.memory)
        await decky.emit("fsg_state", self._snapshot())

    async def _check_update_if_due(self):
        if time.time() - self.last_update_check >= UPDATE_INTERVAL:
            await self._check_update()

    async def _check_update(self):
        self.last_update_check = time.time()
        try:
            self.update = await asyncio.to_thread(_latest_release, CURRENT_VERSION, self.settings["beta"])
        except (OSError, ValueError) as e:
            decky.logger.warning("Update check failed: %s", e)
            return False
        latest = self.update["latest"]
        if self.update["available"] and self.memory.get("update_notified") != latest:
            self.memory["update_notified"] = latest
            _save(MEMORY_FILE, self.memory)
            if self.settings["notify"]:
                await decky.emit("fsg_update", latest, self.update["title"])
        await decky.emit("fsg_state", self._snapshot())
        return True

    async def _check(self):
        async with self._get_lock():
            self.checking = True
            try:
                games, session = await asyncio.to_thread(_fetch_games, self.settings["include_dlc"])
                self.games, self.logged_in, self.error = games, session is not None, ""
                await self._handle_games(session)
            except Exception as e:
                decky.logger.exception("Check failed")
                self.error = str(e)
            finally:
                self.checking = False
                self.last_check = int(time.time())
                _save(MEMORY_FILE, self.memory)
        await decky.emit("fsg_state", self._snapshot())

    async def _handle_games(self, session):
        seen = self.memory["seen"]
        for game in self.games:
            is_new = game["appid"] not in seen
            if is_new:
                seen.append(game["appid"])
            if game["owned"]:
                continue
            attempts = self.memory["attempts"].get(str(game["subid"]), 0)
            if self.settings["auto_claim"] and session and game["subid"] and attempts < MAX_ATTEMPTS:
                ok, _, _ = await self._claim(game, session=session, announce=True)
                if ok:
                    continue
            if is_new and self.settings["notify"]:
                await decky.emit("fsg_new", game["name"], game["appid"])
        current = {str(g["subid"]) for g in self.games}
        self.memory["seen"] = seen[-300:]
        self.memory["attempts"] = {k: v for k, v in self.memory["attempts"].items() if k in current}

    def _count(self, entry):
        """One game counted once, whatever happens to the trimmed history."""
        if entry["appid"] in self.memory["counted"]:
            return
        self.memory["counted"] = (self.memory["counted"] + [entry["appid"]])[-500:]
        totals = self.memory["totals"]
        totals["count"] = totals.get("count", 0) + 1
        totals["cents"] = totals.get("cents", 0) + (entry.get("price_cents") or 0)
        if entry.get("currency"):
            totals["currency"] = entry["currency"]

    async def _backfill_prices(self):
        """Fills in the price of games claimed before this version, or missed earlier."""
        for entry in self.memory["claimed"]:
            if "price_cents" not in entry:
                try:
                    entry["price_cents"], entry["currency"] = await asyncio.to_thread(_price, entry["appid"])
                except (OSError, ValueError) as e:
                    decky.logger.warning("Price of %s unknown: %s", entry["appid"], e)
                    entry["price_cents"], entry["currency"] = 0, ""
                await asyncio.sleep(0.5)
            self._count(entry)
        _save(MEMORY_FILE, self.memory)
        await decky.emit("fsg_state", self._snapshot())

    async def _claim(self, game, session=None, announce=False):
        session = session or await asyncio.to_thread(_session)
        if not session:
            return False, "no_session", ""
        if not game.get("subid"):
            return False, "no_subid", ""
        try:
            ok, code, detail = await asyncio.to_thread(_claim_license, session, game)
        except (OSError, ValueError) as e:
            ok, code, detail = False, "network_error", str(e)
        key = str(game["subid"])
        if ok:
            game["owned"] = True
            self.memory["attempts"].pop(key, None)
            entry = {"appid": game["appid"], "name": game["name"], "ts": int(time.time()),
                     "price_cents": game.get("price_cents") or 0, "currency": game.get("currency") or ""}
            self.memory["claimed"] = (self.memory["claimed"] + [entry])[-50:]
            self._count(entry)
            if announce and self.settings["notify"]:
                await decky.emit("fsg_claimed", game["name"], game["appid"])
        else:
            self.memory["attempts"][key] = self.memory["attempts"].get(key, 0) + 1
        decky.logger.info("Claim %s (sub %s): %s - %s %s", game["name"], game["subid"], ok, code, detail)
        return ok, code, detail
