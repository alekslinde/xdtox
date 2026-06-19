const { isClipPathGroup, isClipMaskNode, innerContentGroup, looksLikeXDFrame, isBackgroundVector, reviewReasonsForXDFrame } = require("./helpers");

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

// ── isClipMaskNode ────────────────────────────────────────────────────────────

describe("isClipMaskNode", () => {
  it("returns true for any node whose name starts with 'clip-'", () => {
    expect(isClipMaskNode({ name: "clip-hero_section" })).toBe(true);
    expect(isClipMaskNode({ name: "clip-SF_I_-_Landing" })).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isClipMaskNode({ name: "  CLIP-Foo  " })).toBe(true);
  });

  it("returns false when name doesn't start with 'clip-'", () => {
    expect(isClipMaskNode({ name: "mask-hero_section" })).toBe(false);
    expect(isClipMaskNode({ name: "Hero Section" })).toBe(false);
  });
});

// ── innerContentGroup ─────────────────────────────────────────────────────────

describe("innerContentGroup", () => {
  it("returns the GROUP child that is not the clip mask", () => {
    var content = { type: "GROUP", name: "SF/I - Landing" };
    var clipGroup = { children: [{ type: "GROUP", name: "clip-SF_I_-_Landing" }, content] };
    expect(innerContentGroup(clipGroup)).toBe(content);
  });

  it("ignores the clip mask even when it is itself a GROUP", () => {
    var content = { type: "GROUP", name: "One last check" };
    var clipGroup = { children: [{ type: "GROUP", name: "clip-One_last_check" }, content] };
    expect(innerContentGroup(clipGroup)).toBe(content);
  });

  it("returns null when there is no non-clip group", () => {
    var clipGroup = { children: [{ type: "GROUP", name: "clip-foo" }, { type: "VECTOR", name: "x" }] };
    expect(innerContentGroup(clipGroup)).toBe(null);
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

  it("returns false when clip path group has only a clip mask and no content group", () => {
    var frame = makeXDFrame("Foo");
    frame.children[0].children = [{ type: "VECTOR", name: "clip-foo" }];
    expect(looksLikeXDFrame(frame)).toBe(false);
  });

  it("matches regardless of how Figma mangled the frame name vs the inner group", () => {
    // Real cases: frame name diverges from the content group name (slash→dash,
    // inserted -1, dedup suffix). Detection must not depend on them matching.
    var frame = {
      type: "FRAME",
      name: "SF-I - Landing 1",
      children: [{
        type: "GROUP",
        name: "Clip path group",
        children: [
          { type: "GROUP", name: "clip-SF_I_-_Landing" },
          { type: "GROUP", name: "SF/I - Landing" },
        ],
      }],
    };
    expect(looksLikeXDFrame(frame)).toBe(true);
  });
});

// ── reviewReasonsForXDFrame ───────────────────────────────────────────────────

function makeReviewFrame(frameName, opts) {
  opts = opts || {};
  var defaultBounds = { x: 0, y: 0, width: 200, height: 150 };
  var contentNodes = opts.contentNodes !== undefined ? opts.contentNodes : [
    { type: "RECTANGLE", name: "bg", absoluteBoundingBox: defaultBounds },
  ];
  var clipChildren = [
    { type: "GROUP", name: frameName, children: contentNodes },
  ];
  if (!opts.omitClipMask) {
    clipChildren.push({ type: "VECTOR", name: "clip-" + frameName.toLowerCase().replace(/\s+/g, "_") });
  }
  if (opts.extraChildren) {
    clipChildren = clipChildren.concat(opts.extraChildren);
  }
  return {
    type: "FRAME",
    name: frameName,
    children: [{ type: "GROUP", name: "Clip path group", children: clipChildren }],
  };
}

describe("reviewReasonsForXDFrame", () => {
  it("returns [] for a clean well-formed frame", () => {
    expect(reviewReasonsForXDFrame(makeReviewFrame("Hero Section"))).toEqual([]);
  });

  it("flags 'clip mask missing' when no clip-{name} node is present", () => {
    var frame = makeReviewFrame("Hero Section", { omitClipMask: true });
    expect(reviewReasonsForXDFrame(frame)).toEqual(["clip mask missing"]);
  });

  it("flags 'unexpected nodes in clip group' when extra children exist", () => {
    var frame = makeReviewFrame("Hero Section", {
      extraChildren: [{ type: "RECTANGLE", name: "stray-rect" }],
    });
    expect(reviewReasonsForXDFrame(frame)).toContain("unexpected nodes in clip group");
  });

  it("flags 'node bounds unavailable' when a content node has no absoluteBoundingBox", () => {
    var frame = makeReviewFrame("Hero Section", {
      contentNodes: [{ type: "RECTANGLE", name: "bg", absoluteBoundingBox: null }],
    });
    expect(reviewReasonsForXDFrame(frame)).toEqual(["node bounds unavailable"]);
  });

  it("reports 'node bounds unavailable' only once even when multiple nodes lack bounds", () => {
    var frame = makeReviewFrame("Hero Section", {
      contentNodes: [
        { type: "RECTANGLE", name: "a", absoluteBoundingBox: null },
        { type: "RECTANGLE", name: "b", absoluteBoundingBox: null },
      ],
    });
    var reasons = reviewReasonsForXDFrame(frame);
    expect(reasons.filter(function(r) { return r === "node bounds unavailable"; })).toHaveLength(1);
  });

  it("returns multiple reasons when multiple conditions are present", () => {
    var frame = makeReviewFrame("Hero Section", {
      omitClipMask: true,
      contentNodes: [{ type: "RECTANGLE", name: "bg", absoluteBoundingBox: null }],
    });
    var reasons = reviewReasonsForXDFrame(frame);
    expect(reasons).toContain("clip mask missing");
    expect(reasons).toContain("node bounds unavailable");
  });

  it("returns [] when inner group has no content nodes (empty children)", () => {
    var frame = makeReviewFrame("Hero Section", { contentNodes: [] });
    expect(reviewReasonsForXDFrame(frame)).toEqual([]);
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
