#!/usr/bin/env python3
"""Tiny HTTP server for RapClouds — serves static files + rating/feedback API.

Endpoints:
    POST /api/rate       — { device_id, image_id, rating }
    GET  /api/ratings    — all ratings (grouped by image)
    POST /api/feedback   — { device_id, name, image_id, text }
    GET  /api/feedback   — all feedback entries
    POST /api/name       — { device_id, name }
    GET  /api/name?id=X  — get name for device

Usage:
    python3 form_server.py              # default port 8099
    python3 form_server.py --port 9000  # custom port
"""

import json
import os
import sys
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RATINGS_FILE = os.path.join(BASE_DIR, "ratings.json")
FEEDBACK_FILE = os.path.join(BASE_DIR, "feedback.json")
NAMES_FILE = os.path.join(BASE_DIR, "visitor_names.json")
SUBMISSIONS_FILE = os.path.join(BASE_DIR, "submissions.json")


def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return default


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def load_submissions():
    return load_json(SUBMISSIONS_FILE, [])


def save_submission(data):
    submissions = load_submissions()
    data["received_at"] = datetime.now(timezone.utc).isoformat()
    submissions.append(data)
    save_json(SUBMISSIONS_FILE, submissions)
    return len(submissions)


def load_ratings():
    return load_json(RATINGS_FILE, {})


def save_rating(data):
    ratings = load_ratings()
    device_id = data.get("device_id", "").strip()
    image_id = data.get("image_id", "").strip()
    rating = data.get("rating")

    if not device_id or not image_id:
        return False, "device_id and image_id required"
    if not isinstance(rating, int) or rating < 0 or rating > 10:
        return False, "rating must be int 0-10"

    if device_id not in ratings:
        ratings[device_id] = {}
    ratings[device_id][image_id] = rating
    save_json(RATINGS_FILE, ratings)
    return True, "ok"


def load_feedback():
    return load_json(FEEDBACK_FILE, [])


def save_feedback_entry(data):
    feedbacks = load_feedback()
    device_id = data.get("device_id", "").strip()
    image_id = data.get("image_id", "").strip()
    text = data.get("text", "").strip()

    if not device_id or not image_id or not text:
        return False, "device_id, image_id, and text required"

    entry = {
        "device_id": device_id,
        "name": data.get("name", "Anonymous"),
        "image_id": image_id,
        "text": text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    feedbacks.append(entry)
    save_json(FEEDBACK_FILE, feedbacks)
    return True, "ok"


def load_names():
    return load_json(NAMES_FILE, {})


def save_name_entry(data):
    names = load_names()
    device_id = data.get("device_id", "").strip()
    name = data.get("name", "").strip()

    if not device_id:
        return False, "device_id required"

    names[device_id] = name
    save_json(NAMES_FILE, names)
    return True, "ok"


def cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class RapCloudsHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/ratings":
            self._json_response(load_ratings())
        elif path == "/api/feedback":
            self._json_response(load_feedback())
        elif path == "/api/name":
            qs = parse_qs(parsed.query)
            device_id = qs.get("id", [""])[0]
            names = load_names()
            self._json_response({"name": names.get(device_id, "")})
        else:
            # Serve static files from this directory
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_error(400, "Empty body")
            return

        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        if path == "/api/submit":
            name = data.get("name", "").strip()
            email = data.get("email", "").strip()
            phone = data.get("phone", "").strip()
            if not name:
                self.send_error(400, "Name is required")
                return
            if not email and not phone:
                self.send_error(400, "Email or phone required")
                return
            count = save_submission(data)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Submission #{count} from {name} ({email or phone})")
            self._json_response({"ok": True, "count": count})

        elif path == "/api/rate":
            ok, msg = save_rating(data)
            if ok:
                self._json_response({"ok": True})
            else:
                self.send_error(400, msg)

        elif path == "/api/feedback":
            ok, msg = save_feedback_entry(data)
            if ok:
                self._json_response({"ok": True})
            else:
                self.send_error(400, msg)

        elif path == "/api/name":
            ok, msg = save_name_entry(data)
            if ok:
                self._json_response({"ok": True})
            else:
                self.send_error(400, msg)

        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def _json_response(self, obj, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        cors_headers(self)
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode())

    def log_message(self, format, *args):
        # Quieter logging — skip static file requests
        if "/api/" in str(args[0]) or "POST" in str(args[0]):
            super().log_message(format, *args)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8099)
    args = parser.parse_args()

    # Init files if missing
    for path, default in [
        (SUBMISSIONS_FILE, []),
        (RATINGS_FILE, {}),
        (FEEDBACK_FILE, []),
        (NAMES_FILE, {}),
    ]:
        if not os.path.exists(path):
            save_json(path, default)

    server = HTTPServer(("0.0.0.0", args.port), RapCloudsHandler)
    print(f"RapClouds server listening on http://0.0.0.0:{args.port}")
    print(f"  Ratings:   {RATINGS_FILE}")
    print(f"  Feedback:  {FEEDBACK_FILE}")
    print(f"  Names:     {NAMES_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()
