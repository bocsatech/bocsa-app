import test from "node:test";
import assert from "node:assert/strict";
import { createHomeAdSlot, createHomeAdStrip } from "../public/js/home-ad-slots.js";

test("createHomeAdStrip: két cella egymás mellett", () => {
  const strip = createHomeAdStrip("left-a", "right-b", { inline: true });
  assert.match(strip.className, /home-ad-strip--inline/);
  assert.equal(strip.querySelectorAll(".home-ad-slot").length, 2);
  assert.equal(strip.querySelector('[data-ad-slot="left-a"]'), strip.querySelectorAll(".home-ad-slot")[0]);
  assert.equal(strip.querySelector('[data-ad-slot="right-b"]'), strip.querySelectorAll(".home-ad-slot")[1]);
});

test("createHomeAdSlot: placeholder alapértelmezés", () => {
  const slot = createHomeAdSlot("test-slot");
  assert.equal(slot.dataset.adSlot, "test-slot");
  assert.ok(slot.querySelector("[data-ad-placeholder]"));
});
