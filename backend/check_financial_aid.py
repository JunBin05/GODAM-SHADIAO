from services.mongodb_service import get_financial_aid

# Check if "Detected IC" has financial aid data
ic = "Detected IC"
result = get_financial_aid(ic)

print(f"\n=== Financial Aid Check for: {ic} ===")
if result:
    print(f"✓ Found financial aid record")
    print(f"  MyKasih Eligible: {result.get('mykasih_eligible')}")
    print(f"  STR Eligible: {result.get('str_eligible')}")
    print(f"  MyKasih Balance: RM {result.get('mykasih_balance_not_expire', 0)}")
else:
    print(f"✗ No financial aid record found for {ic}")
    print(f"\nChecking what ICs exist in financialAid collection...")
    from services.mongodb_service import get_db
    db = get_db()
    aids = list(db.financialAid.find({}, {'_id': 1}))
    print(f"Found {len(aids)} financial aid records:")
    for aid in aids:
        print(f"  - {aid['_id']}")
