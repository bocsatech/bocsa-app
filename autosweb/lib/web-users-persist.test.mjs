import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { spawnSync } from "child_process";

test("profil megmarad process újraindítás után (külön DB fájl)", () => {
  const dir = mkdtempSync(join(tmpdir(), "aw-user-persist-"));
  const dbPath = join(dir, "users.db");

  const write = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
      process.env.AUTOSWEB_DB_PATH = ${JSON.stringify(dbPath)};
      const { registerUser, saveUserProfile, getUserById } = await import(${JSON.stringify(join("/workspace/autosweb/lib/web-users.mjs"))});
      const { user } = registerUser("persist2@test.dev", "pass1", "pass1");
      saveUserProfile(user.id, { firstName: "Gabor", lastName: "Toth", postalCode: "2000", city: "Szentendre" });
      const u = getUserById(user.id);
      if (u.profile.firstName !== "Gabor") process.exit(2);
      `,
    ],
    { encoding: "utf8" }
  );
  assert.equal(write.status, 0, write.stderr || write.stdout);
  assert.ok(existsSync(dbPath));

  const read = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
      process.env.AUTOSWEB_DB_PATH = ${JSON.stringify(dbPath)};
      const { loginUser } = await import(${JSON.stringify(join("/workspace/autosweb/lib/web-users.mjs"))} + "?t=" + Date.now());
      const { user } = loginUser("persist2@test.dev", "pass1");
      if (user.profile.firstName !== "Gabor") {
        console.error(JSON.stringify(user.profile));
        process.exit(3);
      }
      console.log("OK", user.profile.firstName);
      `,
    ],
    { encoding: "utf8" }
  );
  assert.equal(read.status, 0, read.stderr || read.stdout);
  assert.match(read.stdout, /OK Gabor/);
  rmSync(dir, { recursive: true, force: true });
});
