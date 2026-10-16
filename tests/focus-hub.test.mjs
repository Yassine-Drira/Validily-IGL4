import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { soundEngine } from "../src/lib/audio/ambient-soundscapes.ts";

test("Focus Hub: AmbientSoundEngine exports core soundscape methods", () => {
  assert.equal(typeof soundEngine.start, "function");
  assert.equal(typeof soundEngine.stop, "function");
  assert.equal(typeof soundEngine.setVolume, "function");
  assert.equal(typeof soundEngine.playChime, "function");
  assert.equal(typeof soundEngine.getActiveType, "function");
  assert.equal(typeof soundEngine.toggleMute, "function");

  assert.equal(soundEngine.getActiveType(), "none");
  soundEngine.setVolume(0.75);
  assert.equal(soundEngine.getVolume(), 0.75);

  assert.equal(soundEngine.getIsMuted(), false);
  soundEngine.toggleMute();
  assert.equal(soundEngine.getIsMuted(), true);
  soundEngine.toggleMute();
  assert.equal(soundEngine.getIsMuted(), false);
});

test("Focus Hub: Component contract and files exist", () => {
  const providerPath = path.resolve("src/components/focus/focus-provider.tsx");
  const widgetPath = path.resolve("src/components/focus/focus-header-widget.tsx");
  const modalPath = path.resolve("src/components/focus/focus-hub-modal.tsx");

  assert.ok(fs.existsSync(providerPath), "focus-provider.tsx must exist");
  assert.ok(fs.existsSync(widgetPath), "focus-header-widget.tsx must exist");
  assert.ok(fs.existsSync(modalPath), "focus-hub-modal.tsx must exist");

  const layoutContent = fs.readFileSync("src/app/(workspace)/layout.tsx", "utf-8");
  assert.match(layoutContent, /FocusProvider/);
  assert.match(layoutContent, /FocusHubModal/);

  const headerContent = fs.readFileSync("src/components/layout/app-header.tsx", "utf-8");
  assert.match(headerContent, /FocusHeaderWidget/);
});
