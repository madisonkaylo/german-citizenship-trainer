#!/usr/bin/env python3
"""Build the offline app dataset from verified BAMF-aligned references.

German wording and answer correctness come from vlad-com/leben_in_de, checked
against the official BAMF online test. English and explanations are matched
from leben-in-deutschland/leben-in-deutschland-app. Image composites are
downloaded during import so the shipped app never needs network access.
"""
from __future__ import annotations

import difflib
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERIFIED = ROOT / "tmp/reference/verified/fragen.json"
TRANSLATIONS = ROOT / "tmp/reference/translations/src/web/data/question.json"
OUTPUT = ROOT / "src/data/questions.json"
IMAGES = ROOT / "public/question-images"

STATE_CODES = {
    "Bundesland Baden-Württemberg": "BW", "Freistaat Bayern": "BY",
    "Bundesland Berlin": "BE", "Bundesland Brandenburg": "BB",
    "Freien Hansestadt Bremen": "HB", "Hansestadt Hamburg": "HH",
    "Bundesland Hessen": "HE", "Bundesland Mecklenburg-Vorpommern": "MV",
    "Bundesland Niedersachsen": "NI", "Bundesland Nordrhein-Westfalen": "NW",
    "Bundesland Rheinland-Pfalz": "RP", "Bundesland Saarland": "SL",
    "Freistaat Sachsen": "SN", "Bundesland Sachsen-Anhalt": "ST",
    "Bundesland Schleswig-Holstein": "SH", "Freistaat Thüringen": "TH",
}
STATE_NAMES = {
    "BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin", "BB": "Brandenburg",
    "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen", "MV": "Mecklenburg-Vorpommern",
    "NI": "Niedersachsen", "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz",
    "SL": "Saarland", "SN": "Sachsen", "ST": "Sachsen-Anhalt", "SH": "Schleswig-Holstein", "TH": "Thüringen",
}

VOCAB = {
    "Grundgesetz": ("Basic Law / Constitution", "Das Grundgesetz schützt unsere Rechte.", ["Grundrecht", "Verfassung"]),
    "Meinungsfreiheit": ("freedom of expression", "Meinungsfreiheit ist ein Grundrecht.", ["Meinung", "Pressefreiheit"]),
    "Bundesland": ("federal state", "Bayern ist ein Bundesland.", ["Bund", "Landtag"]),
    "Rechtsstaat": ("state governed by the rule of law", "In einem Rechtsstaat gelten Gesetze für alle.", ["Recht", "Gesetz"]),
    "Bundestag": ("Federal Parliament", "Der Bundestag beschließt Gesetze.", ["Abgeordnete", "Parlament"]),
    "Bundesrat": ("Federal Council", "Im Bundesrat wirken die Länder mit.", ["Bundesland", "Gesetz"]),
    "Wahl": ("election", "Die Wahl ist frei und geheim.", ["wählen", "Stimme"]),
    "Verfassung": ("constitution", "Die Verfassung heißt Grundgesetz.", ["Grundgesetz", "Recht"]),
    "Menschenwürde": ("human dignity", "Die Menschenwürde ist unantastbar.", ["Menschenrecht", "Grundrecht"]),
    "Gleichberechtigung": ("equal rights", "Gleichberechtigung gilt für alle Menschen.", ["Gleichheit", "Recht"]),
    "Religionsfreiheit": ("freedom of religion", "Religionsfreiheit schützt Glauben und Nichtglauben.", ["Religion", "Glauben"]),
    "Pressefreiheit": ("freedom of the press", "Pressefreiheit schützt unabhängige Medien.", ["Presse", "Meinungsfreiheit"]),
    "Abgeordnete": ("member of parliament", "Abgeordnete vertreten die Bevölkerung.", ["Bundestag", "Parlament"]),
    "Bundeskanzler": ("Federal Chancellor", "Der Bundeskanzler leitet die Bundesregierung.", ["Regierung", "Kanzleramt"]),
    "Bundespräsident": ("Federal President", "Der Bundespräsident ist das Staatsoberhaupt.", ["Staatsoberhaupt", "Bund"]),
    "Gemeinde": ("municipality / local community", "Die Gemeinde kümmert sich um lokale Aufgaben.", ["Kommune", "Bürgermeister"]),
    "Gewerkschaft": ("trade union", "Eine Gewerkschaft vertritt Beschäftigte.", ["Arbeit", "Tarifvertrag"]),
    "Sozialversicherung": ("social insurance", "Die Sozialversicherung schützt bei Krankheit und Arbeitslosigkeit.", ["Versicherung", "Sozialstaat"]),
    "Wiedervereinigung": ("reunification", "Die deutsche Wiedervereinigung war 1990.", ["Einheit", "DDR"]),
    "Nationalsozialismus": ("National Socialism / Nazism", "Der Nationalsozialismus war eine Diktatur.", ["Diktatur", "Holocaust"]),
}

def norm(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).lower().replace("…", "...")
    value = re.sub(r"\s*/\s*", "/", value)
    return re.sub(r"[^a-zäöüß0-9]+", " ", value).strip()

def best_match(question: str, candidates: list[dict]) -> dict:
    target = norm(question)
    exact = next((x for x in candidates if norm(x["question"]) == target), None)
    if exact:
        return exact
    return max(candidates, key=lambda x: difflib.SequenceMatcher(None, target, norm(x["question"])).ratio())

def translated_option(option: str, source: dict) -> str:
    keys = ["a", "b", "c", "d"]
    key = max(keys, key=lambda k: difflib.SequenceMatcher(None, norm(option), norm(source[k])).ratio())
    return source.get("translation", {}).get("en", {}).get(key, source[key])

def download_image(source: dict, question_id: str) -> str | None:
    url = source.get("image")
    if not url or url == "-" or not url.startswith("http"):
        return None
    suffix = Path(url.split("?")[0]).suffix or ".jpg"
    target = IMAGES / f"{question_id}{suffix}"
    if not target.exists():
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=20) as response:
                target.write_bytes(response.read())
        except Exception as exc:
            print(f"warning: image {question_id}: {exc}")
            return None
    return f"/question-images/{target.name}"

def vocabulary_for(text: str) -> list[dict]:
    found = []
    lowered = text.lower()
    for word, (english, example, related) in VOCAB.items():
        if word.lower() in lowered:
            found.append({"german": word, "english": english, "example": example, "related": related})
    return found[:5]

def main() -> None:
    verified = json.loads(VERIFIED.read_text())
    translations = json.loads(TRANSLATIONS.read_text())
    IMAGES.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    rows: list[tuple[dict, str | None]] = [(q, None) for q in verified["questions"]]
    for raw_state, questions in verified["questions_land"].items():
        rows.extend((q, STATE_CODES[raw_state]) for q in questions)

    output = []
    for question, state in rows:
        scoped = translations
        if state:
            prefixed = [x for x in translations if str(x["num"]).startswith(f"{state}-")]
            if prefixed:
                scoped = prefixed
        else:
            scoped = [x for x in translations if str(x["num"]).isdigit()]
        source = best_match(question["question"], scoped)
        qid = f"{state or 'DE'}-{question['id']}"
        english = source.get("translation", {}).get("en", {})
        answers = [
            {"german": option.strip(), "english": translated_option(option, source).strip(), "correct": index + 1 == question["correct_answer"]}
            for index, option in enumerate(question["options"])
        ]
        correct = answers[question["correct_answer"] - 1]
        context = english.get("context", "").strip()
        explanation = context or f"The correct answer is {correct['english']}. This is an important part of Germany's civic and democratic system."
        output.append({
            "id": qid,
            "number": question["id"],
            "section": source.get("category", "Civic life").strip("'"),
            "state": STATE_NAMES.get(state) if state else None,
            "germanQuestion": question["question"].strip(),
            "englishQuestion": english.get("question", question["question"]).strip(),
            "answers": answers,
            "explanation": explanation,
            "image": download_image(source, qid) if question.get("images") else None,
            "vocabulary": vocabulary_for(question["question"] + " " + " ".join(question["options"])),
        })

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {len(output)} questions ({sum(bool(q['image']) for q in output)} images) to {OUTPUT}")

if __name__ == "__main__":
    main()
