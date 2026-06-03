const { isClipPathGroup, isFrameNameGroup, isClipMaskNode, looksLikeXDFrame, isBackgroundVector } = require("./helpers");

// ── isClipPathGroup ───────────────────────────────────────────────────────────

describe("isClipPathGroup", () => {
  it("returns true for a GROUP named 'Clip path group'", () => {
    expect(isClipPathGroup({ type: "GROUP", name: "Clip path group" })).toBe(true);
  });

  it("returns true for 'clip-path group' variant", () => {
    expect(isClipPathGroup({ type: "GROUP", name: "clip-path group" })).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isClipPathGroup({ type: "GROUP", name: "  CLIP PATH GROUP  " })).toBe(true);
  });

  it("returns false for a non-GROUP node with matching name", () => {
    expect(isClipPathGroup({ type: "FRAME", name: "Clip path group" })).toBe(false);
  });

  it("returns false for an unrelated group name", () => {
    expect(isClipPathGroup({ type: "GROUP", name: "My Group" })).toBe(false);
  });
});

// ── isFrameNameGroup ──────────────────────────────────────────────────────────

describe("isFrameNameGroup", () => {
  it("returns true when the GROUP name matches the frame name", () => {
    expect(isFrameNameGroup({ type: "GROUP", name: "Hero Section" }, "Hero Section")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isFrameNameGroup({ type: "GROUP", name: "hero section" }, "Hero Section")).toBe(true);
  });

  it("returns false for a non-GROUP node", () => {
    expect(isFrameNameGroup({ type: "FRAME", name: "Hero Section" }, "Hero Section")).toBe(false);
  });

  it("returns false when names differ", () => {
    expect(isFrameNameGroup({ type: "GROUP", name: "Other" }, "Hero Section")).toBe(false);
  });
});

// ── isClipMaskNode ────────────────────────────────────────────────────────────

describe("isClipMaskNode", () => {
  it("returns true when node name is 'clip-{frame_name_underscored}'", () => {
    expect(isClipMaskNode({ name: "clip-hero_section" }, "Hero Section")).toBe(true);
  });

  it("returns true when node name is 'clip-{frame-name-dashed}'", () => {
    expect(isClipMaskNode({ name: "clip-hero-section" }, "Hero Section")).toBe(true);
  });

  it("returns false when name doesn't start with 'clip-'", () => {
    expect(isClipMaskNode({ name: "mask-hero_section" }, "Hero Section")).toBe(false);
  });

  it("returns false when the suffix doesn't match the frame name", () => {
    expect(isClipMaskNode({ name: "clip-other_name" }, "Hero Section")).toBe(false);
  });

  it("handles single-word frame names", () => {
    expect(isClipMaskNode({ name: "clip-home" }, "Home")).toBe(true);
  });
});

// ── looksLikeXDFrame ──────────────────────────────────────────────────────────

function makeXDFrame(frameName) {
  return {
    type: "FRAME",
    name: frameName,
    children: [
      {
        type: "GROUP",
        name: "Clip path group",
        children: [
          { type: "GROUP", name: frameName },
          { type: "VECTOR", name: `clip-${frameName.toLowerCase().replace(/\s+/g, "_")}` },
        ],
      },
    ],
  };
}

describe("looksLikeXDFrame", () => {
  it("returns true for a well-formed XD frame", () => {
    expect(looksLikeXDFrame(makeXDFrame("Landing Page"))).toBe(true);
  });

  it("returns true for a COMPONENT type", () => {
    var frame = makeXDFrame("Card");
    frame.type = "COMPONENT";
    expect(looksLikeXDFrame(frame)).toBe(true);
  });

  it("returns false for non-FRAME / non-COMPONENT node", () => {
    var node = makeXDFrame("Foo");
    node.type = "GROUP";
    expect(looksLikeXDFrame(node)).toBe(false);
  });

  it("returns false when frame has more than one direct child", () => {
    var frame = makeXDFrame("Foo");
    frame.children.push({ type: "TEXT", name: "extra" });
    expect(looksLikeXDFrame(frame)).toBe(false);
  });

  it("returns false when direct child is not a clip path group", () => {
    var frame = makeXDFrame("Foo");
    frame.children[0].name = "Random Group";
    expect(looksLikeXDFrame(frame)).toBe(false);
  });

  it("returns false when clip path group has no inner group matching frame name", () => {
    var frame = makeXDFrame("Foo");
    frame.children[0].children = [{ type: "VECTOR", name: "clip-foo" }];
    expect(looksLikeXDFrame(frame)).toBe(false);
  });
});

// ── isBackgroundVector ────────────────────────────────────────────────────────

function makeFrame(x, y, w, h) {
  return { absoluteBoundingBox: { x, y, width: w, height: h } };
}

function makeVector(x, y, w, h, fills = [{ type: "SOLID" }], type = "VECTOR") {
  return { type, fills, absoluteBoundingBox: { x, y, width: w, height: h } };
}

describe("isBackgroundVector", () => {
  it("returns true for a VECTOR that exactly covers the frame", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = makeVector(0, 0, 400, 300);
    expect(isBackgroundVector(node, frame)).toBe(true);
  });

  it("returns true for a RECTANGLE that covers the frame", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = makeVector(0, 0, 400, 300, [{ type: "SOLID" }], "RECTANGLE");
    expect(isBackgroundVector(node, frame)).toBe(true);
  });

  it("returns true for a node within the 2% + 2px tolerance", () => {
    var frame = makeFrame(100, 100, 400, 300);
    // 1px off in every direction — well within tolerance
    var node  = makeVector(101, 101, 398, 298);
    expect(isBackgroundVector(node, frame)).toBe(true);
  });

  it("returns false when node type is TEXT", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = { type: "TEXT", fills: [{ type: "SOLID" }], absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 } };
    expect(isBackgroundVector(node, frame)).toBe(false);
  });

  it("returns false when fills array is empty", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = makeVector(0, 0, 400, 300, []);
    expect(isBackgroundVector(node, frame)).toBe(false);
  });

  it("returns false when node is much smaller than the frame", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = makeVector(0, 0, 200, 150);
    expect(isBackgroundVector(node, frame)).toBe(false);
  });

  it("returns false when absoluteBoundingBox is missing on the node", () => {
    var frame = makeFrame(0, 0, 400, 300);
    var node  = { type: "VECTOR", fills: [{ type: "SOLID" }], absoluteBoundingBox: null };
    expect(isBackgroundVector(node, frame)).toBe(false);
  });
});
