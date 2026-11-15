import importlib.util
import time
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("translations", Path(__file__).resolve().parents[1] / "scripts" / "translate-descriptions.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TranslationTests(unittest.TestCase):
    def test_duplicate_descriptions_share_translation_and_original_is_unchanged(self):
        calls = []
        def translate(text, source, target, cached):
            calls.append((text, target))
            return "本地数据库"
        repos = [{"description": "A local database"}, {"description": "A local database"}]
        entries = {}
        module.enrich(repos, entries, lambda text: "en", translate)
        self.assertEqual(calls, [("A local database", "zh")])
        self.assertEqual(len(entries), 1)
        self.assertEqual(repos[0]["description"], "A local database")
        self.assertEqual(repos[1]["descriptionTranslations"]["zh"], "本地数据库")

    def test_changed_description_does_not_reuse_old_translation(self):
        entries = {module.source_key("old"): {"source": "old", "sourceLanguage": "en", "translations": {"zh": "旧简介"}}}
        repo = {"description": "new"}
        module.enrich([repo], entries, lambda text: "en", lambda *args: "新简介")
        self.assertEqual(repo["descriptionTranslations"]["zh"], "新简介")

    def test_removes_model_space_markers_from_new_and_cached_translations(self):
        source = "中文简介"
        cache = {module.source_key(source): {"source": source, "sourceLanguage": "zh", "translations": {"en": "A▁local▁database"}}}
        repo = {"description": source}
        module.enrich([repo], cache, lambda text: "zh", lambda *_: self.fail("inference called"))
        self.assertEqual(repo["descriptionTranslations"]["en"], "A local database")
        fresh = {"description": "新的简介"}
        module.enrich([fresh], {}, lambda text: "zh", lambda *_: "New▁description")
        self.assertEqual(fresh["descriptionTranslations"]["en"], "New description")

    def test_failure_keeps_original_and_successful_other_target(self):
        def translate(text, source, target, cached):
            if target == "zh":
                raise OSError("offline")
            return "A new tool"
        repo = {"description": "Un nouvel outil"}
        module.enrich([repo], {}, lambda text: "fr", translate)
        self.assertEqual(repo["description"], "Un nouvel outil")
        self.assertEqual(repo["descriptionTranslations"], {"en": "A new tool"})

    def test_time_budget_preserves_cached_results_without_inference(self):
        source = "A local database"
        cache = {module.source_key(source): {"source": source, "sourceLanguage": "en", "translations": {"zh": "数据库"}}}
        repo = {"description": source}
        module.enrich([repo], cache, lambda *_: self.fail("detect called"), lambda *_: self.fail("inference called"), time.monotonic() - 1)
        self.assertEqual(repo["descriptionTranslations"]["zh"], "数据库")


if __name__ == "__main__":
    unittest.main()
