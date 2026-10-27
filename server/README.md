# Document extraction server

Express API for passport and insurance extraction, document review, registry storage, and CSV/JSON exports. Application code uses CommonJS modules.

## Structure

```text
server/
├── src/
│   ├── app.js                         # Express middleware and route composition
│   ├── server.js                      # Environment, process handlers, OCR warm-up, listener
│   ├── config/                        # Central paths, extraction options, insurance patterns
│   ├── routes/                        # API URLs and upload middleware bindings
│   ├── controllers/                   # HTTP input, status codes, response payloads
│   ├── middleware/                    # Multer upload configuration
│   ├── services/
│   │   ├── ocr/                       # Worker queue, preprocessing, image/PDF OCR, scoring
│   │   ├── document-text.service.js   # File-to-text orchestration
│   │   ├── document-type.service.js   # Passport/insurance classification
│   │   ├── document-names.service.js  # Response name normalization
│   │   └── registry-export.service.js # CSV/JSON serialization
│   ├── parsers/
│   │   ├── passport.parser.js         # Passport processing stages in execution order
│   │   ├── passport/                  # Visual fields, fallbacks, names, normalization, extras
│   │   ├── insurance.parser.js        # Insurance fields and policy subtypes
│   │   ├── mrz.parser.js              # MRZ alignment and check digits
│   │   └── helpers/                   # Dates, countries, names, fields, subtype patterns
│   └── repositories/                  # Persistence and optional storage adapters
├── scripts/
│   ├── diagnostics/                   # Manual OCR experiments and API checks
│   └── samples/                       # Existing OCR-text sample runners
├── tests/                             # Automated parser and HTTP integration tests
├── data/                              # Existing JSON registry; location preserved
├── uploads/                           # Existing documents and OCR render scratch files
├── index.js                           # Compatibility launcher for node index.js
├── parser.js                          # Compatibility export for require('./parser')
├── eng.traineddata                    # Existing Tesseract language cache
└── package.json
```

`src/config/paths.js` anchors storage, uploads, the client directory, and OCR output to the server directory. Moving source files does not relocate saved documents. The OCR worker also uses the existing server language cache regardless of the shell's working directory.

## Run

From the project root:

```sh
npm install --prefix server
npm run server
```

For a plain Node process, run `npm start --prefix server`. `node server/index.js` remains supported. The development command watches `src/` and `.env`, so uploads and JSON registry writes do not trigger restarts.

The server loads `server/.env`. Use `.env.example` as a reference without overwriting an existing configuration. The default port is `5058`; the existing retry behavior tries higher ports through `5100` when a port is occupied.

Run the frontend separately with `npm run client` from the project root. Static client serving retains the existing source-directory configuration; this refactor does not introduce a production frontend deployment setup.

## Request flow

`routes → controllers → services/parsers → repositories`

- Routes declare URLs and multipart field names. Keep HTTP response handling in controllers.
- OCR services handle files, rendering, preprocessing, and the persistent Tesseract worker queue.
- Parsers extract structured data from text. Shared date/name/country helpers live beside them.
- `passport.parser.js` coordinates MRZ extraction, visible labels, fallback fields, optional AI gap filling, name resolution, normalization, and supplemental fields in the original order.
- The active registry repository caches records in memory and writes `data/passports.json`. The MongoDB and insurance-account repositories are preserved optional adapters and are not connected to the API.
- Import `src/app.js` for HTTP integration without starting a listener or warming OCR workers. `src/server.js` owns startup behavior.

## API compatibility

- `GET /api/passports` — registry array.
- `POST /api/passports` — create a record.
- `PUT /api/passports/:id` — update a record.
- `DELETE /api/passports/:id` — delete a record.
- `GET /api/export/csv` and `GET /api/export/json` — registry downloads.
- `POST /api/scan` — multipart `file`, optional `docType`.
- `POST /api/scan-multi` — multipart `files`, optional `docType`; returns per-file results.
- `POST /api/scan/snippet` — multipart `file`, optional `length`.
- `/uploads/*` — existing document preview URLs.

Scanning does not persist registry records. The client still performs registry writes, including its batch auto-save behavior. Existing extraction heuristics and response formats are preserved.

## Verification

```sh
npm test --prefix server
```

Tests use synthetic documents and isolated temporary storage. HTTP integration tests exercise Express, Multer, registry persistence, previews, exports, and error responses while substituting file-to-text extraction. Parser tests run the actual parser stages with AI disabled. They do not call external AI services or measure OCR accuracy.

Manual tools live under `scripts/diagnostics/`, for example:

```sh
node server/scripts/diagnostics/detect-document-type.js
node server/scripts/diagnostics/verify-passport-fields.js
node server/scripts/diagnostics/scan-pdf-api.js
```

The verification and OCR comparison scripts process existing uploads and can print extracted document data. The PDF API check requires a running server and uses `PORT`, defaulting to `5058`. `inspect-native-ocr.js` requires the native `tesseract` executable. Sample text runners are in `scripts/samples/`.

Existing reference artifacts (`test.pdf`, `debug.png`, `out.json`, and `ocr_last.txt`) remain in their original locations. The application and diagnostics can still use them.
