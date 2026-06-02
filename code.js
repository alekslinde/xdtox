// UnXDfy – strips Adobe XD SVG import artifacts from Figma frames.
//
// Exact XD structure observed in Figma after SVG import:
//
//   Frame  "Menu-Dash – 7"
//     └─ Group  "Clip path group"          ← outer wrapper, always this name
//          ├─ Group  "Menu-Dash – 7"       ← inner group named after the frame
//          │    └─ [actual content nodes]
//          └─ Node   "clip-Menu-Dash_7"    ← clip mask node, name: "clip-{sanitised frame name}"
//
// Steps to clean:
//   1. Detect the "Clip path group" child of the frame
//   2. Inside it, find the inner group matching the frame name → extract its children into the frame
//   3. Delete the clip-{name} mask node
//   4. Delete the now-empty "Clip path group"

figma.showUI(__html__, { width: 340, height: 420, themeColors: true });

// ─── helpers ─────────────────────────────────────────────────────────────────

function isClipPathGroup(node) {
  if (node.type !== "GROUP") return false;
  var n = node.name.toLowerCase().trim();
  return n === "clip path group" || n === "clip-path group";
}

function isFrameNameGroup(node, frameName) {
  if (node.type !== "GROUP") return false;
  return node.name.toLowerCase().trim() === frameName.toLowerCase().trim();
}

function isClipMaskNode(node, frameName) {
  // XD names this "clip-FrameName" with spaces→underscores and dashes kept
  var name = node.name.toLowerCase().trim();
  // starts with "clip-" and roughly matches the frame name
  if (!name.startsWith("clip-")) return false;
  var sanitised = frameName.toLowerCase().trim().replace(/\s+/g, "_");
  var candidate = name.slice(5); // after "clip-"
  // loose match: check sanitised version matches
  return candidate === sanitised || candidate === frameName.toLowerCase().trim().replace(/\s+/g, "-");
}

function looksLikeXDFrame(frame) {
  if (frame.type !== "FRAME" && frame.type !== "COMPONENT") return false;
  if (frame.children.length !== 1) return false;

  var clipGroup = frame.children[0];
  if (!isClipPathGroup(clipGroup)) return false;

  // Must contain at least the inner frame-name group
  var hasInnerGroup = false;
  for (var i = 0; i < clipGroup.children.length; i++) {
    if (isFrameNameGroup(clipGroup.children[i], frame.name)) {
      hasInnerGroup = true;
      break;
    }
  }

  return hasInnerGroup;
}

function isBackgroundVector(node, frame) {
  if (node.type !== "VECTOR" && node.type !== "RECTANGLE") return false;
  // Must have at least one solid fill
  if (!node.fills || node.fills.length === 0) return false;

  // Check it covers (approximately) the full frame
  var nb = node.absoluteBoundingBox;
  var fb = frame.absoluteBoundingBox;
  if (!nb || !fb) return false;

  var tolX = fb.width  * 0.02 + 2;
  var tolY = fb.height * 0.02 + 2;
  var coversWidth  = Math.abs(nb.width  - fb.width)  <= tolX;
  var coversHeight = Math.abs(nb.height - fb.height) <= tolY;
  var alignedX = Math.abs(nb.x - fb.x) <= tolX;
  var alignedY = Math.abs(nb.y - fb.y) <= tolY;

  return coversWidth && coversHeight && alignedX && alignedY;
}

function promoteBackgroundFill(frame) {
  // The background vector will be the first child (bottom of stack) after stripping
  if (frame.children.length === 0) return;
  var candidate = frame.children[0];

  if (!isBackgroundVector(candidate, frame)) return;

  // Copy its fills onto the frame
  var fills = candidate.fills;
  if (fills && fills.length > 0) {
    frame.fills = fills;
  }

  // Remove the background vector node
  candidate.remove();
}

function stripXDWrappers(frame) {
  if (!looksLikeXDFrame(frame)) return { skipped: true };

  var clipGroup = frame.children[0];

  // Find the inner content group and the clip mask node
  var innerGroup = null;
  var clipMask = null;

  for (var i = 0; i < clipGroup.children.length; i++) {
    var child = clipGroup.children[i];
    if (isFrameNameGroup(child, frame.name)) {
      innerGroup = child;
    } else if (isClipMaskNode(child, frame.name)) {
      clipMask = child;
    }
  }

  if (!innerGroup) return { skipped: true, reason: "no inner group" };

  var contentNodes = [];
  for (var j = 0; j < innerGroup.children.length; j++) {
    contentNodes.push(innerGroup.children[j]);
  }

  if (contentNodes.length === 0) return { skipped: true, reason: "empty" };

  // Cache frame absolute bounds before moving nodes
  var frameAbs = frame.absoluteBoundingBox;

  // Re-parent content nodes directly into the frame
  for (var k = 0; k < contentNodes.length; k++) {
    var node = contentNodes[k];
    var nodeBounds = node.absoluteBoundingBox;

    // Skip position reassignment if either bounding box is unavailable —
    // defaulting to 0 would silently teleport the node to the frame's origin.
    var hasBounds = nodeBounds && frameAbs;
    var absX = hasBounds ? nodeBounds.x : null;
    var absY = hasBounds ? nodeBounds.y : null;

    frame.appendChild(node);

    if (absX !== null) {
      node.x = absX - frameAbs.x;
      node.y = absY - frameAbs.y;
    }
  }

  // Delete clip mask node if found
  if (clipMask) {
    clipMask.remove();
  }

  // Delete the now-empty clip path group (which also removes empty innerGroup)
  clipGroup.remove();

  // Promote background vector fill to the frame and remove the vector
  promoteBackgroundFill(frame);

  return { stripped: true };
}

// ─── message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = function(msg) {
  if (msg.type === "scan") {
    var selection = figma.currentPage.selection;
    var useFile = msg.scope === "file";
    var root = useFile ? figma.root : figma.currentPage;

    if (selection.length === 0) {
      var allFrames = root.findAll(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
      var affected = allFrames.filter(function(f) { return looksLikeXDFrame(f); });
      figma.ui.postMessage({
        type: "scan-result",
        count: affected.length,
        names: affected.map(function(f) { return f.name; }),
        mode: useFile ? "file" : "page",
      });
    } else {
      var affected = selection.filter(function(n) {
        return (n.type === "FRAME" || n.type === "COMPONENT") && looksLikeXDFrame(n);
      });
      figma.ui.postMessage({
        type: "scan-result",
        count: affected.length,
        names: affected.map(function(f) { return f.name; }),
        mode: "selection",
        selectionCount: selection.length,
      });
    }
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "strip") {
    var useFile = msg.scope === "file";
    var root = useFile ? figma.root : figma.currentPage;
    var targets;

    if (msg.useSelection) {
      targets = figma.currentPage.selection.filter(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
    } else {
      targets = root.findAll(function(n) {
        return n.type === "FRAME" || n.type === "COMPONENT";
      });
    }

    var stripped = 0;
    var skipped = 0;

    for (var i = 0; i < targets.length; i++) {
      var result = stripXDWrappers(targets[i]);
      if (result.stripped) stripped++;
      else skipped++;
    }

    figma.ui.postMessage({ type: "done", stripped: stripped, skipped: skipped });
    figma.notify(
      stripped > 0
        ? "\u2736 UnXDfy: cleaned " + stripped + " frame" + (stripped !== 1 ? "s" : "") +
          (skipped > 0 ? ", skipped " + skipped : "")
        : "No XD wrapper frames found."
    );
  }

};
