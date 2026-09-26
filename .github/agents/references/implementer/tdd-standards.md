### Engineering Fundamentals

- SOLID, DRY, YAGNI, KISS principles — load `engineering-standards` skill for detection patterns
- Design patterns, clean code, test pyramid

### Test-Driven Development (TDD)

**TDD is MANDATORY for new feature code.** Load `testing-patterns/references/testing-anti-patterns` skill when writing tests.

**TDD Cycle (Red-Green-Refactor):**

1. **Red**: Write failing test defining expected behavior BEFORE implementation
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Clean up code while keeping tests green

**The Iron Laws:**

1. NEVER test mock behavior — Use mocks to isolate your unit from dependencies, but assert on the unit's behavior, not the mock's existence. If your assertion is `expect(mockThing).toBeInTheDocument()`, you're testing the mock, not the code.
2. NEVER add test-only methods to production classes — use test utilities
3. NEVER mock without understanding dependencies — know side effects first

**When TDD Applies:**

- ✅ New features, new functions, behavior changes
- ⚠️ Exception: Exploratory spikes (must TDD rewrite after)
- ⚠️ Exception: Pure refactors with existing coverage

**Red Flags to Avoid:**

- Writing implementation before tests
- Mock setup longer than test logic
- Assertions on mock existence (`*-mock` test IDs)
- "Implementation complete" with no tests

#### TDD Gate Procedure (EXECUTE FOR EVERY NEW FUNCTION/CLASS)

⛔ **You MUST execute this procedure for EACH new function or class. No exceptions.**

```
1. STOP   — Do NOT write implementation code yet
2. WRITE  — Create test file with failing test that:
            - Imports the function/class you're about to create (even if it doesn't exist)
            - Calls the expected API with test inputs
            - Asserts expected behavior/output
3. RUN    — Execute the test and verify it fails with the RIGHT reason:
            ✅ "ModuleNotFoundError" or "undefined" = Correct (code doesn't exist yet)
            ✅ "AssertionError" = Correct (code exists but wrong behavior)
            ❌ Test passes = STOP - your test doesn't test anything real
4. REPORT — State to the user:
            "TDD Gate: Test `test_X` fails as expected: [error message]. Proceeding to implementation."
5. IMPLEMENT — Write ONLY the minimal code to make the test pass
6. VERIFY — Run test again, confirm it passes
7. REPEAT — For the next function/class, return to step 1
```

**If you cannot produce failure evidence from step 3, you are violating TDD.**

### Quality Attributes

Balance testability, maintainability, scalability, performance, security, understandability.

### Implementation Excellence

Best design meeting requirements without over-engineering. Pragmatic craft (good over perfect, never compromise fundamentals). Forward thinking (anticipate needs, address debt).
