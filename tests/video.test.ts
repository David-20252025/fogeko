import assert from "node:assert/strict";
import { test } from "node:test";
import { videoEmbed } from "../src/lib/video";

test("liens YouTube", () => {
  for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "https://youtu.be/dQw4w9WgXcQ", "https://m.youtube.com/shorts/dQw4w9WgXcQ"])
    assert.equal(videoEmbed(url)?.thumb, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", url);
});
test("lien Facebook", () => assert.match(videoEmbed("https://www.facebook.com/fogeko/videos/123")!.embed, /plugins\/video\.php/));
test("liens refusés", () => {
  for (const url of ["pas une url", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=<script>"]) assert.equal(videoEmbed(url), null, url);
});
