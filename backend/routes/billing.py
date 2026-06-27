from __future__ import annotations

import stripe
from flask import current_app, g, jsonify, request

from urllib.parse import urlsplit

from backend.auth.supabase import require_auth
from backend.services import stripe_billing
from backend.services.trade_limits import trade_limit_snapshot


def _origin_of(url: str | None) -> str | None:
    if not url:
        return None
    parts = urlsplit(url)
    if parts.scheme and parts.netloc:
        return f"{parts.scheme}://{parts.netloc}"
    return None


def _redirect_origin() -> str | None:
    """Best-effort caller origin for Stripe redirects.

    Tries an explicit body ``origin`` (sent by the web app), then the ``Origin``
    header, then ``Referer``. The value is validated downstream against an
    allowlist, so untrusted origins safely fall back to FRONTEND_URL.
    """
    body = request.get_json(silent=True) or {}
    candidate = (
        _origin_of(body.get("origin"))
        or _origin_of(request.headers.get("Origin"))
        or _origin_of(request.headers.get("Referer"))
    )
    return candidate


def register_billing_routes(billing_bp):
    @billing_bp.route("/checkout-session", methods=["POST"])
    @require_auth
    def create_checkout_session(user_id: str):
        email = getattr(g, "user_email", None)
        origin = _redirect_origin()
        try:
            url = stripe_billing.create_checkout_session(user_id, email, origin)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 503
        except stripe.StripeError as exc:
            return jsonify({"error": str(exc.user_message or exc)}), 502
        return jsonify({"url": url})

    @billing_bp.route("/portal-session", methods=["POST"])
    @require_auth
    def create_portal_session(user_id: str):
        origin = _redirect_origin()
        try:
            url = stripe_billing.create_portal_session(user_id, origin)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except stripe.StripeError as exc:
            return jsonify({"error": str(exc.user_message or exc)}), 502
        return jsonify({"url": url})

    @billing_bp.route("/sync", methods=["POST"])
    @require_auth
    def sync_billing(user_id: str):
        payload = request.get_json(silent=True) or {}
        session_id = payload.get("session_id")
        try:
            stripe_billing.sync_after_checkout(
                user_id,
                str(session_id).strip() if session_id else None,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except stripe.StripeError as exc:
            return jsonify({"error": str(exc.user_message or exc)}), 502
        body = trade_limit_snapshot(user_id)
        body.update(stripe_billing.billing_status_dict(user_id))
        return jsonify(body)

    @billing_bp.route("/status", methods=["GET"])
    @require_auth
    def get_billing_status(user_id: str):
        body = trade_limit_snapshot(user_id)
        body.update(stripe_billing.billing_status_dict(user_id))
        return jsonify(body)


def register_stripe_webhook(app):
    @app.route("/webhooks/stripe", methods=["POST"])
    def stripe_webhook():
        payload = request.get_data()
        sig_header = request.headers.get("Stripe-Signature", "")
        secret = (current_app.config.get("STRIPE_WEBHOOK_SECRET") or "").strip()
        if not secret:
            return jsonify({"error": "STRIPE_WEBHOOK_SECRET is not configured"}), 503

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
        except ValueError:
            return jsonify({"error": "Invalid payload"}), 400
        except stripe.SignatureVerificationError:
            return jsonify({"error": "Invalid signature"}), 400

        try:
            stripe_billing.handle_stripe_event(event)
        except Exception:
            current_app.logger.exception("Stripe webhook handler failed")
            return jsonify({"error": "Webhook handler failed"}), 500

        return jsonify({"received": True})
