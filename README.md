# boubakikid

Pleasant, round ID generator based on [bouba/kiki effect](https://en.wikipedia.org/wiki/Bouba/kiki_effect) research.

Uses a custom 30-character alphabet that excludes angular/spiky letterforms (k, v, w, x, z), producing IDs that look and feel softer:

```
a4b8c2d6e0f1g   ← boubakikid
kXvW9zK4xZmR1   ← standard nanoid
```

## Install

```bash
npm install boubakikid
```

## Usage

```typescript
import { id, shortId, tinyId, createId } from "boubakikid";

id();       // "a4b8c2d6e0f1g"  (13 chars, ~64 bits)
shortId();  // "a4b8c2d6e"      (9 chars, ~44 bits)
tinyId();   // "a4b8c2d"        (7 chars, ~34 bits)

// Custom length
const sessionId = createId(21);
sessionId(); // "a4b8c2d6e0f1g3h5i7j9l"
```

## Alphabet

```
0123456789abcdefghijlmnopqrstuy
```

30 characters → ~4.9 bits per character. No uppercase, no angular consonants.

## License

MIT
