#!/usr/bin/env node
/**
 * Build player guide as FB2 and PDF from docs/player-guide.ru.md
 * Usage: node scripts/build-guide.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcPath = join(root, "docs", "player-guide.ru.md");
const outDir = join(root, "docs");
const fb2Path = join(outDir, "player-guide.ru.fb2");
const pdfPath = join(outDir, "player-guide.ru.pdf");

const md = readFileSync(srcPath, "utf8");

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(text) {
  return escapeXml(
    text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .trim(),
  );
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: null, blocks: [] };
  let paragraph = [];
  let inTable = false;
  let tableRows = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) {
      current.blocks.push({ type: "p", text });
    }
    paragraph = [];
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      current.blocks.push({ type: "table", rows: tableRows });
      tableRows = [];
      inTable = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushTable();
      if (current.title || current.blocks.length > 0) {
        sections.push(current);
      }
      current = { title: line.slice(3).trim(), blocks: [] };
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushTable();
      current.blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }
    if (line.trim() === "---") {
      flushParagraph();
      flushTable();
      continue;
    }
    if (line.trim().startsWith("|")) {
      flushParagraph();
      inTable = true;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        continue;
      }
      tableRows.push(cells);
      continue;
    }
    if (inTable && line.trim() === "") {
      flushTable();
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }
    if (line.trim().startsWith("```")) {
      flushParagraph();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushTable();
  if (current.title || current.blocks.length > 0) {
    sections.push(current);
  }
  return sections;
}

function blockToFb2(block) {
  if (block.type === "p") {
    return `      <p>${inlineMd(block.text)}</p>\n`;
  }
  if (block.type === "h3") {
    return `      <subtitle>${inlineMd(block.text)}</subtitle>\n`;
  }
  if (block.type === "table") {
    return block.rows
      .map((row) => `      <p>${row.map((c) => inlineMd(c)).join(" — ")}</p>\n`)
      .join("");
  }
  return "";
}

function buildFb2(sections) {
  const body = sections
    .map((section) => {
      const blocks = section.blocks.map(blockToFb2).join("");
      return `    <section>
      <title><p>${inlineMd(section.title ?? "")}</p></title>
${blocks}    </section>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>nonfiction</genre>
      <author>
        <first-name>LOTR</first-name>
        <last-name>Map Game</last-name>
      </author>
      <book-title>Гайд по игре: Кольцо и карта Средиземья</book-title>
      <annotation>
        <p>Справочник по правилам: рекруты, локации, Кольцо, бой, еда, транспорт и концовки.</p>
      </annotation>
      <lang>ru</lang>
    </title-info>
    <document-info>
      <author>
        <nickname>lotr-map</nickname>
      </author>
      <date value="${new Date().toISOString().slice(0, 10)}">Сгенерировано автоматически</date>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
    <title>
      <p>Гайд по игре</p>
    </title>
${body}
  </body>
</FictionBook>
`;
}

function buildHtml(sections) {
  const css = `
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; margin: 2cm; }
    h1 { font-size: 20pt; text-align: center; margin-bottom: 1.5em; border-bottom: 2px solid #333; padding-bottom: 0.5em; }
    h2 { font-size: 14pt; margin-top: 1.5em; color: #2c1810; page-break-after: avoid; }
    h3 { font-size: 12pt; margin-top: 1em; color: #444; }
    p { margin: 0.5em 0; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 10pt; }
    th, td { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    th { background: #f0ebe3; font-weight: bold; }
    tr:nth-child(even) td { background: #faf8f5; }
    .meta { text-align: center; color: #666; font-size: 10pt; margin-bottom: 2em; }
    code { font-family: Consolas, monospace; font-size: 9pt; background: #f5f5f5; padding: 1px 4px; }
  `;

  const body = sections
    .map((section) => {
      const blocks = section.blocks
        .map((block) => {
          if (block.type === "p") {
            const html = block.text
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/`(.+?)`/g, "<code>$1</code>");
            return `<p>${html}</p>`;
          }
          if (block.type === "h3") {
            return `<h3>${escapeXml(block.text)}</h3>`;
          }
          if (block.type === "table") {
            const [head, ...rows] = block.rows;
            const thead = `<thead><tr>${head.map((c) => `<th>${escapeXml(c)}</th>`).join("")}</tr></thead>`;
            const tbody = `<tbody>${rows
              .map((row) => `<tr>${row.map((c) => `<td>${escapeXml(c)}</td>`).join("")}</tr>`)
              .join("")}</tbody>`;
            return `<table>${thead}${tbody}</table>`;
          }
          return "";
        })
        .join("\n");
      return `<h2>${escapeXml(section.title ?? "")}</h2>\n${blocks}`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Гайд по игре: Кольцо и карта Средиземья</title>
  <style>${css}</style>
</head>
<body>
  <h1>Гайд по игре: Кольцо и карта Средиземья</h1>
  <p class="meta">Правила по коду игры. День 0 = 23 сентября 3018.</p>
  ${body}
</body>
</html>`;
}

function buildPdfWithChrome(htmlPath, pdfOut) {
  const chromePaths = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  for (const chrome of chromePaths) {
    const result = spawnSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--print-to-pdf=${pdfOut}`,
        "--print-to-pdf-no-header",
        fileUrl,
      ],
      { stdio: "pipe", encoding: "utf8" },
    );
    if (result.status === 0) {
      return true;
    }
  }
  return false;
}

mkdirSync(outDir, { recursive: true });
const sections = parseMarkdown(md);

writeFileSync(fb2Path, buildFb2(sections), "utf8");
console.log(`FB2: ${fb2Path}`);

const htmlPath = join(outDir, "player-guide.ru.html");
writeFileSync(htmlPath, buildHtml(sections), "utf8");

const pdfOk = buildPdfWithChrome(htmlPath, pdfPath);
if (pdfOk) {
  console.log(`PDF: ${pdfPath}`);
} else {
  console.error("PDF: не удалось — Chrome/Edge не найден. HTML сохранён:", htmlPath);
  process.exitCode = 1;
}
