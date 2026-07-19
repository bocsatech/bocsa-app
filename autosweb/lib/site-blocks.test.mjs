import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

test("getSiteBlocks és saveSiteBlocks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "autosweb-blocks-"));
  process.env.AUTOSWEB_BLOCKS_PATH = join(dir, "site-blocks.json");

  const { getSiteBlocks, saveSiteBlocks } = await import(`./site-blocks.mjs?t=${Date.now()}`);

  const initial = getSiteBlocks();
  assert.ok(initial.left?.title);
  assert.ok(initial.right?.html);

  const saved = saveSiteBlocks({
    left: { title: "Bal teszt", html: "<p>Bal tartalom</p>" },
    right: { title: "Jobb teszt", html: "<p>Jobb tartalom</p>" },
  });
  assert.equal(saved.left.title, "Bal teszt");
  assert.equal(saved.right.html, "<p>Jobb tartalom</p>");

  const loaded = getSiteBlocks();
  assert.equal(loaded.left.title, "Bal teszt");

  delete process.env.AUTOSWEB_BLOCKS_PATH;
  rmSync(dir, { recursive: true, force: true });
});
