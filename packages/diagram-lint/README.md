# @wokwi/diagram-lint

Linter for Wokwi `diagram.json` files. Catches common issues like invalid pins, missing components, and duplicate IDs.

## Installation

```bash
npm install @wokwi/diagram-lint
```

## Usage

```typescript
import { DiagramLinter } from '@wokwi/diagram-lint';

const linter = new DiagramLinter();
const result = linter.lint(diagram);

if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.severity}] ${issue.rule}: ${issue.message}`);
  }
}
```

## Rules

| Rule                | Severity | Description                                |
| ------------------- | -------- | ------------------------------------------ |
| `duplicate-id`      | error    | Parts with duplicate IDs                   |
| `invalid-pin`       | error    | Connections using non-existent pins        |
| `missing-component` | error    | Connections referencing non-existent parts |
| `unknown-part-type` | error    | Unknown part types                         |
| `wrong-coord-names` | error    | Using `x`/`y` instead of `left`/`top`      |
| `invalid-attribute` | warning  | Unknown or invalid attributes              |
| `misplaced-coords`  | warning  | `top`/`left` inside attrs                  |
| `redundant-parts`   | warning  | Parts with no connections                  |
| `unsupported-part`  | info     | Parts not in official documentation        |

## Configuration

```typescript
const linter = new DiagramLinter({
  rules: {
    'redundant-parts': false, // disable rule
    'invalid-attribute': { severity: 'error' }, // change severity
  },
});
```

## Loading Latest Board Definitions

The linter includes built-in board definitions, but you can load the latest definitions at runtime from the [wokwi-boards](https://github.com/wokwi/wokwi-boards) bundle:

```typescript
import { DiagramLinter } from '@wokwi/diagram-lint';

const linter = new DiagramLinter();

// Fetch and load the latest board definitions
const bundle = await fetch('https://wokwi.github.io/wokwi-boards/boards.json').then((r) =>
  r.json(),
);
const count = linter.getRegistry().loadBoardsBundle(bundle);
console.log(`Loaded ${count} boards`);

// Now lint with the latest board pin definitions
const result = linter.lint(diagram);
```

## Adding Parts

Part definitions are in `src/registry/parts/`. To add or update a part:

1. Edit the JSON file in `src/registry/parts/wokwi-<part-name>.json`
2. Run `npm run build:parts` to regenerate `parts.json`

## License

[The MIT License (MIT)](LICENSE)
