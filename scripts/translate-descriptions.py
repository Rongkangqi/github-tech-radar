"""Translate public repository descriptions on the runner; no API key or browser service.

Uses official Argos model packages with the CTranslate2 CPU runtime. The browser
receives only text. Original descriptions and successful cached translations survive
model/network failures. Cache keys include the complete original description.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
MODELS = ROOT / ".cache" / "translation-models"
INDEX_URL = "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json"
TARGETS = ("zh", "en")
PROVIDER = "Argos Translate / CTranslate2"
REPORTED_FAILURES = set()


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)


def source_key(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def enrich(repos, entries, detect, translate, deadline=float("inf")):
    """Injectable detection/inference makes cache and failure behavior testable."""
    for repo in repos:
        source = repo["description"]
        key = source_key(source)
        cached = entries.get(key, {})
        if cached.get("source") != source:
            cached = {"source": source, "sourceLanguage": detect(source), "translations": {}}
        language = cached["sourceLanguage"]
        translations = cached["translations"]
        # Do English first so another source language can pivot through its cached English.
        for target in ("en", "zh"):
            if language == target or translations.get(target) or time.monotonic() >= deadline:
                continue
            try:
                text = translate(source, language, target, translations)
                if isinstance(text, str) and text.strip() and text.strip() != source.strip():
                    translations[target] = text.strip()
            except Exception as error:
                # The public text is not logged. Failures must not stop data publication.
                failure = (language, target, type(error).__name__)
                if failure not in REPORTED_FAILURES:
                    REPORTED_FAILURES.add(failure)
                    print(f"Translation unavailable ({language}->{target}, {type(error).__name__}).", flush=True)
        entries[key] = cached
        repo["descriptionLanguage"] = language
        repo["descriptionTranslations"] = dict(translations)
    return repos


class OfflineTranslator:
    def __init__(self):
        from langid.langid import LanguageIdentifier, model
        self.identifier = LanguageIdentifier.from_modelstring(model, norm_probs=True)
        self.identifier.set_languages(["en", "zh", "ja", "ko", "fr", "de", "es", "pt", "ru", "ar", "vi", "it", "uk", "tr", "pl", "id", "fa", "th"])
        self.index = None
        self.failed = set()
        MODELS.mkdir(parents=True, exist_ok=True)

    def detect(self, text):
        # Remove links so host names do not bias language detection.
        cleaned = re.sub(r"https?://\S+|`[^`]+`", " ", text).strip()
        if not re.search(r"[^\W\d_]", cleaned, re.UNICODE):
            return "und"
        # Short technical English often looks like a Scandinavian/Latin language to
        # statistical detectors. Script and common English terms resolve these cases.
        if re.search(r"[\u3040-\u30ff]", cleaned):
            return "ja"
        if re.search(r"[\uac00-\ud7af]", cleaned):
            return "ko"
        if len(re.findall(r"[\u3400-\u9fff]", cleaned)) >= 4:
            return "zh"
        words = re.findall(r"[a-z]+", cleaned.lower())
        english = {"the", "a", "an", "for", "with", "your", "and", "to", "of", "in", "on", "is", "open", "source", "developer", "agent", "code", "tool", "app", "framework", "skills", "kernel", "desktop", "emulator", "editor", "inference", "engineering"}
        hits = sum(word in english for word in words)
        if cleaned.isascii() and (hits >= 2 or (hits and len(words) <= 8)):
            return "en"
        return self.identifier.classify(cleaned)[0]

    def packages(self):
        if self.index is None:
            cached = MODELS / "index.json"
            try:
                with urllib.request.urlopen(INDEX_URL, timeout=30) as response:
                    self.index = json.load(response)
                write_json(cached, self.index)
            except Exception:
                self.index = read_json(cached, [])
        return self.index

    @lru_cache(maxsize=2)
    def load(self, source, target):
        import ctranslate2
        import sentencepiece
        pair = (source, target)
        if pair in self.failed:
            raise RuntimeError("Model unavailable for this run")
        try:
            candidates = [p for p in self.packages() if p["from_code"] == source and p["to_code"] == target]
            if not candidates:
                raise ValueError("Unsupported language pair")
            package = max(candidates, key=lambda p: tuple(int(n) for n in p["package_version"].split(".")))
            folder = MODELS / f'{source}-{target}-{package["package_version"]}'
            metadata = list(folder.glob("*/metadata.json"))
            if not metadata:
                links = [url for url in package["links"] if url.startswith("https://")]
                # Official mirror avoids failures at the default model host.
                filename = links[0].rsplit("/", 1)[-1]
                links.insert(0, "https://data.argosopentech.com/argospm/v1/" + filename)
                archive = MODELS / f"{source}-{target}.download"
                print(f"Downloading translation model {source}->{target}.", flush=True)
                last_error = None
                for link in links:
                    try:
                        with urllib.request.urlopen(link, timeout=60) as response, archive.open("wb") as output:
                            while chunk := response.read(1024 * 1024):
                                output.write(chunk)
                        last_error = None
                        break
                    except Exception as error:
                        last_error = error
                if last_error:
                    raise last_error
                with zipfile.ZipFile(archive) as zipped:
                    # Packages are data, never executable code. Reject path traversal.
                    for member in zipped.infolist():
                        destination = (folder / member.filename).resolve()
                        if folder.resolve() not in destination.parents:
                            raise ValueError("Invalid model archive path")
                    zipped.extractall(folder)
                archive.unlink()
                metadata = list(folder.glob("*/metadata.json"))
            base = metadata[0].parent
            info = read_json(metadata[0], {})
            tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(base / "sentencepiece.model"))
            translator = ctranslate2.Translator(str(base / "model"), device="cpu", compute_type="int8", intra_threads=min(4, os.cpu_count() or 2))
            return tokenizer, translator, info.get("target_prefix", "")
        except Exception:
            self.failed.add(pair)
            raise

    def direct(self, text, source, target):
        tokenizer, model, prefix = self.load(source, target)
        # Short sentence chunks avoid truncating unusually long GitHub descriptions.
        chunks = []
        for paragraph in re.split(r"\n+", text):
            pieces = re.split(r"(?<=[.!?。！？])\s+", paragraph)
            for piece in pieces:
                while len(piece) > 220:
                    boundary = piece.rfind(" ", 80, 220)
                    boundary = boundary if boundary > 0 else 220
                    chunks.append(piece[:boundary])
                    piece = piece[boundary:].lstrip()
                if piece.strip():
                    chunks.append(piece)
        if not chunks:
            return text
        tokenized = [tokenizer.encode(chunk, out_type=str) for chunk in chunks]
        results = model.translate_batch(tokenized, target_prefix=[[prefix]] * len(chunks) if prefix else None,
                                        beam_size=3, replace_unknowns=True, max_batch_size=16,
                                        max_input_length=1024, max_decoding_length=1024,
                                        repetition_penalty=1.1, no_repeat_ngram_size=4)
        translated = []
        for result in results:
            decoded = tokenizer.decode(result.hypotheses[0])
            if prefix and decoded.startswith(prefix):
                decoded = decoded[len(prefix):]
            translated.append(decoded.strip())
        return " ".join(translated)

    def translate(self, text, source, target, cached):
        if source == "und":
            return None
        if source == "en" or target == "en":
            return self.direct(text, source, target)
        english = cached.get("en") or self.direct(text, source, "en")
        return self.direct(english, "en", target)


def main():
    engine = OfflineTranslator()
    cache_path = DATA / "translations.json"
    cache = read_json(cache_path, {})
    entries = cache.get("entries", {}) if cache.get("version") == 2 else {}
    snapshots = [(DATA / f"radar-{days}.json") for days in (7, 30, 90)]
    deadline = time.monotonic() + 480
    active = set()
    for path in snapshots:
        snapshot = read_json(path)
        if not snapshot or not isinstance(snapshot.get("repos"), list):
            continue
        enrich(snapshot["repos"], entries, engine.detect, engine.translate, deadline)
        active.update(source_key(repo["description"]) for repo in snapshot["repos"])
        write_json(path, snapshot)
        # Save completed work even if a subsequent range or model fails.
        write_json(cache_path, {"version": 2, "provider": PROVIDER, "entries": entries})
    # Keep recent descriptions for ranges which have temporarily left the sample.
    retained = dict(list((k, v) for k, v in entries.items() if k not in active)[-1500:])
    retained.update({k: entries[k] for k in active})
    write_json(cache_path, {"version": 2, "provider": PROVIDER, "entries": retained})
    count = sum(bool(entries[k]["translations"]) for k in active)
    print(f"Descriptions: {len(active)} distinct, {count} with translated text.", flush=True)


if __name__ == "__main__":
    main()
