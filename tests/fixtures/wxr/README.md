# WXR fixtures for integration tests

## Committed file

- **`aldus-test-content.xml`** — WordPress WXR 1.2 export with draft posts used to regression-test block markup validation (`WxrImportedPostsValidationTest`).

## Override path

Point PHPUnit at a different export (e.g. a large local file):

```bash
ALDUS_WXR_FIXTURE=/absolute/path/to/export.xml vendor/bin/phpunit -c phpunit-integration.xml.dist --filter WxrImportedPostsValidationTest
```

Relative paths are resolved from the **repository root** (same directory as `aldus.php`).

## Re-exporting from WordPress

1. **Tools → Export** → choose content types → **Download Export File**.
2. Save as needed; replace `aldus-test-content.xml` or use `ALDUS_WXR_FIXTURE`.
