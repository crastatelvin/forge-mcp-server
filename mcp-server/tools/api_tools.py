# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import os

import httpx


def get_weather(city: str) -> dict:
    if not city or not isinstance(city, str):
        return {"error": "city is required"}

    api_key = os.getenv("WEATHER_API_KEY", "").strip()

    # Prefer OpenWeatherMap if a key is configured
    if api_key:
        try:
            with httpx.Client(timeout=8.0) as client:
                response = client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"q": city, "appid": api_key, "units": "metric"},
                )
                if response.status_code != 200:
                    return {
                        "error": f"OpenWeatherMap returned {response.status_code}",
                        "city": city,
                    }
                data = response.json()
                main = data.get("main", {}) or {}
                wind = data.get("wind", {}) or {}
                weather = (data.get("weather") or [{}])[0]
                return {
                    "city": city,
                    "temperature_c": main.get("temp"),
                    "temperature_f": round(main.get("temp", 0) * 9 / 5 + 32, 1)
                    if main.get("temp") is not None
                    else None,
                    "feels_like_c": main.get("feels_like"),
                    "humidity": main.get("humidity"),
                    "description": weather.get("description", ""),
                    "wind_kmph": round(wind.get("speed", 0) * 3.6, 1)
                    if wind.get("speed") is not None
                    else None,
                    "source": "openweathermap",
                }
        except Exception as e:
            return {"error": str(e), "city": city, "source": "openweathermap"}

    # Free fallback: wttr.in (no API key required)
    try:
        with httpx.Client(timeout=8.0) as client:
            response = client.get(
                f"https://wttr.in/{city}",
                params={"format": "j1"},
                headers={"User-Agent": "ForgeMCP/1.0"},
            )
            if response.status_code != 200:
                return {"error": f"wttr.in returned {response.status_code}", "city": city}
            data = response.json()
            current = (data.get("current_condition") or [{}])[0]
            weather_desc = (current.get("weatherDesc") or [{}])[0]
            return {
                "city": city,
                "temperature_c": current.get("temp_C"),
                "temperature_f": current.get("temp_F"),
                "feels_like_c": current.get("FeelsLikeC"),
                "humidity": current.get("humidity"),
                "description": weather_desc.get("value", ""),
                "wind_kmph": current.get("windspeedKmph"),
                "source": "wttr.in",
            }
    except Exception as e:
        return {"error": str(e), "city": city, "source": "wttr.in"}
