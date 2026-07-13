"""AnthropicProvider - direct Anthropic API or Azure AI Foundry.

Mode selection (checked in order):
    1. ``ANTHROPIC_FOUNDRY_RESOURCE`` is set → Azure AI Foundry via ``AnthropicFoundry``.
       Key: ``ANTHROPIC_API_KEY`` (falls back to ``ANTHROPIC_API_KEY``).
    2. ``ANTHROPIC_API_KEY`` alone → direct ``api.anthropic.com`` via ``Anthropic``.

Both modes are gated behind ``LLM_ALLOW_EXTERNAL=true`` (ADR-0009).

Env vars (set in .env):
    ANTHROPIC_FOUNDRY_RESOURCE   - Azure AI Foundry resource name; triggers Foundry mode
    ANTHROPIC_API_KEY    - Foundry resource key (falls back to ANTHROPIC_API_KEY)
    ANTHROPIC_API_KEY            - direct API key (also Foundry fallback)
    LLM_ALLOW_EXTERNAL           - must be ``true``
Pass ``--llm-url anthropic --llm-model <model>`` on the CLI.
"""

from __future__ import annotations

import json
import os
from typing import Any

_GATE_VAR = "LLM_ALLOW_EXTERNAL"
_DEFAULT_MODEL = "claude-sonnet-4-6"


class AnthropicProvider:
    """Call Anthropic via AnthropicFoundry (Azure) or Anthropic (direct)."""

    def __init__(
        self,
        model_id: str | None = None,
        api_key: str | None = None,
        timeout: int = 120,
    ) -> None:
        if os.getenv(_GATE_VAR, "").lower() != "true":
            raise RuntimeError(
                f"AnthropicProvider requires {_GATE_VAR}=true in the environment. "
                "Ensure PL-13 data-boundary review is complete before enabling."
            )
        self.model_id = model_id or os.getenv("LLM_MODEL_ID") or _DEFAULT_MODEL
        self.timeout = timeout
        self._client = _build_client(api_key)

    def chat_completions(self, request: dict[str, Any]) -> dict[str, Any]:
        payload = _to_anthropic(request, self.model_id)
        model = payload.pop("model")
        msg = self._client.messages.create(model=model, **payload)
        return _from_anthropic_sdk(msg)


# ---------------------------------------------------------------------------
# Client construction
# ---------------------------------------------------------------------------


def _build_client(api_key: str | None) -> Any:
    try:
        import anthropic  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError("anthropic package is not installed - run uv sync") from exc

    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    if resource:
        resolved_key = (
            api_key or os.getenv("ANTHROPIC_API_KEY", "") or os.getenv("ANTHROPIC_API_KEY", "")
        )
        if not resolved_key:
            raise RuntimeError(
                "AnthropicProvider (Foundry): set ANTHROPIC_API_KEY in the environment."
            )
        return anthropic.AnthropicFoundry(api_key=resolved_key, resource=resource)

    resolved_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not resolved_key:
        raise RuntimeError("AnthropicProvider: set ANTHROPIC_API_KEY in the environment.")
    return anthropic.Anthropic(api_key=resolved_key)


# ---------------------------------------------------------------------------
# Format translation: OpenAI → Anthropic Messages API
# ---------------------------------------------------------------------------


def _to_anthropic(openai_request: dict[str, Any], model: str) -> dict[str, Any]:
    messages = openai_request.get("messages", [])
    system_parts = [m["content"] for m in messages if m.get("role") == "system"]
    user_messages = [m for m in messages if m.get("role") != "system"]

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": openai_request.get("max_tokens", 4096),
        "messages": [{"role": m["role"], "content": m["content"]} for m in user_messages],
    }
    if system_parts:
        payload["system"] = "\n\n".join(system_parts)

    oai_tools = openai_request.get("tools", [])
    if oai_tools:
        payload["tools"] = [
            {
                "name": t["function"]["name"],
                "description": t["function"].get("description", ""),
                "input_schema": t["function"].get("parameters", {}),
            }
            for t in oai_tools
        ]
        oai_choice = openai_request.get("tool_choice", "auto")
        payload["tool_choice"] = {"type": "any"} if oai_choice == "required" else {"type": "auto"}

    return payload


# ---------------------------------------------------------------------------
# Format translation: Anthropic SDK response → OpenAI
# ---------------------------------------------------------------------------


def _from_anthropic_sdk(msg: Any) -> dict[str, Any]:
    tool_calls: list[dict[str, Any]] = []
    text_parts: list[str] = []

    for block in msg.content:
        if block.type == "tool_use":
            tool_calls.append(
                {
                    "id": block.id,
                    "type": "function",
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    },
                }
            )
        elif block.type == "text":
            text_parts.append(block.text)

    message: dict[str, Any] = {"role": "assistant", "content": " ".join(text_parts)}
    if tool_calls:
        message["tool_calls"] = tool_calls
    return {
        "choices": [{"message": message, "finish_reason": "tool_calls" if tool_calls else "stop"}]
    }


__all__ = ["AnthropicProvider"]

