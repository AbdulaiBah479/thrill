# Word guide source

`THRILL-Complete-Guide.docx` (one folder up) is built from these files.

To rebuild it:

```
cd docs/word-guide-source
npm init -y
npm install docx
node build.js ../THRILL-Complete-Guide.docx
```

`build.js` holds the main sections. `section16.js`, `section17.js` and `section18.js` hold the later sections.
