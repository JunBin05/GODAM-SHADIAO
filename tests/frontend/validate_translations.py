import json

print("\n" + "="*60)
print("TRANSLATIONS.JSON VALIDATION REPORT")
print("="*60)

with open('backend/data/translations.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"\n✅ JSON syntax is VALID!")
print(f"\nTop-level sections: {len(data)}")
for key in data.keys():
    print(f"  - {key}")

# Check language coverage
required_langs = ['en', 'ms', 'zh', 'ta']
print(f"\n{'='*60}")
print("LANGUAGE COVERAGE CHECK")
print("="*60)

incomplete = []
for section, items in data.items():
    if isinstance(items, dict):
        for key, translations in items.items():
            if isinstance(translations, dict):
                missing = [lang for lang in required_langs if lang not in translations]
                if missing:
                    incomplete.append(f"{section}.{key}: missing {missing}")

if incomplete:
    print("\n⚠️  INCOMPLETE TRANSLATIONS:")
    for item in incomplete:
        print(f"  - {item}")
else:
    print("\n✅ All entries have complete translations (en, ms, zh, ta)")

# Count total translations
total_entries = sum(len(items) for items in data.values() if isinstance(items, dict))
print(f"\n{'='*60}")
print(f"TOTAL TRANSLATION ENTRIES: {total_entries}")
print(f"LANGUAGES SUPPORTED: {', '.join(required_langs)}")
print("="*60 + "\n")
